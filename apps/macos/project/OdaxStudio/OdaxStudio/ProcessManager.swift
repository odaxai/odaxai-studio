import Foundation
import Combine

/// Status of each service
enum ServiceStatus: String {
    case stopped = "Waiting"
    case starting = "Starting"
    case running = "Ready"
    case failed = "Error"
}

class ProcessManager: ObservableObject {
    @Published var isReady = false
    @Published var statusMessage = ""
    @Published var errorMessage: String? = nil
    @Published var serviceStatuses: [String: ServiceStatus] = [
        "Web Interface": .stopped,
        "AI Engine": .stopped
    ]
    
    private var dashboardProcess: Process?
    private var odaxChatProcess: Process?
    private var llamaServerProcess: Process?
    private var pythonExecutorProcess: Process?
    private var healthCheckTimer: Timer?
    private var serviceMonitorTimer: Timer?
    
    // Dynamically resolved paths - no hardcoded Desktop path
    private let projectRoot: String
    private let scriptsPath: String
    private let modelsPath: String
    private let llamaServerPath: String
    private var installationError: String? = nil
    
    init() {
        // Try multiple methods to find project root
        projectRoot = ProcessManager.findProjectRoot()
        scriptsPath = "\(projectRoot)/apps/macos/scripts"
        modelsPath = NSHomeDirectory() + "/.odax/models"
        llamaServerPath = "\(projectRoot)/server/llama.cpp/build/bin/llama-server"
        print("🔧 ProcessManager initialized with root: \(projectRoot)")
        
        // Validate installation
        validateInstallation()
    }
    
    /// Find the project root using multiple strategies
    private static func findProjectRoot() -> String {
        // Strategy 1: Environment variable (highest priority)
        if let envRoot = ProcessInfo.processInfo.environment["ODAX_PROJECT_ROOT"] {
            print("📁 Using ODAX_PROJECT_ROOT env: \(envRoot)")
            return envRoot
        }
        
        // Strategy 2: Saved config file in ~/.odax/config
        let configPath = NSHomeDirectory() + "/.odax/project_root"
        if let savedRoot = try? String(contentsOfFile: configPath, encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines) {
            if FileManager.default.fileExists(atPath: savedRoot + "/apps/macos/scripts") {
                print("📁 Using saved project root: \(savedRoot)")
                return savedRoot
            }
        }
        
        // Strategy 3: Search common locations for odaxai-studio (NO Desktop paths to avoid permission request)
        let searchPaths = [
            // New open source repo name
            NSHomeDirectory() + "/Documents/odaxai-studio",
            NSHomeDirectory() + "/Desktop/odaxai-studio",
            NSHomeDirectory() + "/Downloads/odaxai-studio",
            NSHomeDirectory() + "/Projects/odaxai-studio",
            NSHomeDirectory() + "/Developer/odaxai-studio",
            // Legacy/user specific names
            NSHomeDirectory() + "/Documents/OdaxEngine",
            NSHomeDirectory() + "/Projects/OdaxEngine",
            NSHomeDirectory() + "/Developer/OdaxEngine",
            NSHomeDirectory() + "/Desktop/code/olf/OdaxEngine",
            "/Applications/odaxai-studio",
            "/Applications/OdaxEngine"
        ]
        
        for path in searchPaths {
            if FileManager.default.fileExists(atPath: path + "/apps/macos/scripts") {
                print("📁 Found project at: \(path)")
                // Save for future use
                try? FileManager.default.createDirectory(atPath: NSHomeDirectory() + "/.odax", withIntermediateDirectories: true)
                try? path.write(toFile: configPath, atomically: true, encoding: .utf8)
                return path
            }
        }
        
        // Strategy 4: Try bundle path (works if app is in project folder)
        let bundlePath = Bundle.main.bundlePath
        var url = URL(fileURLWithPath: bundlePath)
        for _ in 0..<10 {
            url = url.deletingLastPathComponent()
            let testPath = url.path + "/apps/macos/scripts"
            if FileManager.default.fileExists(atPath: testPath) {
                print("📁 Found project via bundle: \(url.path)")
                try? FileManager.default.createDirectory(atPath: NSHomeDirectory() + "/.odax", withIntermediateDirectories: true)
                try? url.path.write(toFile: configPath, atomically: true, encoding: .utf8)
                return url.path
            }
        }
        
        // Fallback: return a path that will trigger installation error
        print("❌ Could not find odaxai-studio project")
        return "/odaxai-studio-NOT-FOUND"
    }
    
    private func validateInstallation() {
        let fm = FileManager.default
        var errors: [String] = []
        
        // Check if scripts directory exists
        if !fm.fileExists(atPath: scriptsPath) {
            errors.append("Scripts folder not found at \(scriptsPath)")
        }
        
        // Check if start-odaxchat.sh exists
        let odaxChatScript = "\(scriptsPath)/start-odaxchat.sh"
        if !fm.fileExists(atPath: odaxChatScript) {
            errors.append("Startup script not found")
        }
        
        // Check if models directory exists
        if !fm.fileExists(atPath: modelsPath) {
            // Try to create it
            do {
                try fm.createDirectory(atPath: modelsPath, withIntermediateDirectories: true, attributes: nil)
                print("📁 Created models directory: \(modelsPath)")
            } catch {
                errors.append("Cannot create models folder at ~/.odax/models")
            }
        }
        
        // Check if odax-chat exists
        let odaxChatPath = "\(projectRoot)/services/odax-chat"
        if !fm.fileExists(atPath: odaxChatPath) {
            errors.append("OdaxAI Chat service not found")
        }
        
        if !errors.isEmpty {
            installationError = errors.joined(separator: "\n")
            print("❌ Installation errors: \(installationError ?? "")")
        }
    }
    
    func startServices() {
        print("🚀 Starting all services...")
        
        // Check for installation errors first
        if let error = installationError {
            DispatchQueue.main.async {
                self.errorMessage = """
Installation Problem

\(error)

How to fix:
1. Make sure OdaxStudio is run from within the odaxai-studio project folder
2. Or set ODAX_PROJECT_ROOT environment variable to the project path
3. Restart the app after fixing

Project root detected: \(self.projectRoot)
"""
                self.serviceStatuses["Web Interface"] = .failed
                self.serviceStatuses["AI Engine"] = .failed
            }
            return
        }
        
        statusMessage = "Checking services..."
        errorMessage = nil
        
        // Reset all statuses
        DispatchQueue.main.async {
            self.serviceStatuses["Web Interface"] = .starting
            self.serviceStatuses["AI Engine"] = .starting
        }
        
        // Check if Dashboard is already running (port 3000)
        let servicesAlreadyRunning = isPortInUse(port: 3000)
        
        if servicesAlreadyRunning {
            print("✅ Services already running, skipping startup")
            DispatchQueue.main.async {
                self.startHealthCheck()
                self.startServiceMonitor()
            }
            return
        }
        
        // Services not running - start them
        print("📦 Starting services from scratch...")
        cleanupPorts()
        
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            
            // Start Dashboard (Port 3000)
            self.runScript("start-dashboard.sh")
            
            // Start OdaxChat (Web Interface - Port 3002) - CRITICAL for UI
            self.runScript("start-odaxchat.sh")
            
            // Start Python Executor
            self.runScript("start-python-executor.sh")

            Thread.sleep(forTimeInterval: 0.5)

            // Start llama-server (AI Engine)
            self.runScript("start-llama.sh")
            
            DispatchQueue.main.async {
                self.startHealthCheck()
                self.startServiceMonitor()
            }
        }
    }
    
    /// Check if a port is already in use
    private func isPortInUse(port: Int) -> Bool {
        let lsof = Process()
        lsof.executableURL = URL(fileURLWithPath: "/usr/sbin/lsof")
        lsof.arguments = ["-ti:\(port)"]
        
        let pipe = Pipe()
        lsof.standardOutput = pipe
        lsof.standardError = FileHandle.nullDevice
        
        do {
            try lsof.run()
            lsof.waitUntilExit()
            
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            return !data.isEmpty
        } catch {
            return false
        }
    }
    
    private func runScript(_ scriptName: String) {
        let scriptPath = "\(scriptsPath)/\(scriptName)"
        print("🔵 Running: \(scriptName)")
        
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/bash")
        process.arguments = [scriptPath]
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice
        
        if scriptName.contains("dashboard") {
            dashboardProcess = process
        } else if scriptName.contains("odaxchat") {
            odaxChatProcess = process
        } else if scriptName.contains("python-executor") {
            pythonExecutorProcess = process
        }
        
        do {
            try process.run()
            print("✅ Started: \(scriptName) (PID: \(process.processIdentifier))")
        } catch {
            print("❌ Failed: \(scriptName) - \(error)")
        }
    }
    
    private func startLlamaServer() {
        // Find first GGUF model
        guard let modelPath = findFirstModel() else {
            print("⚠️ No GGUF model found, skipping llama-server")
            return
        }
        
        guard FileManager.default.fileExists(atPath: llamaServerPath) else {
            print("⚠️ llama-server not found at \(llamaServerPath)")
            return
        }
        
        print("🦙 Starting llama-server with: \(modelPath)")
        
        llamaServerProcess = Process()
        llamaServerProcess?.executableURL = URL(fileURLWithPath: llamaServerPath)
        llamaServerProcess?.arguments = [
            "-m", modelPath,
            "--host", "127.0.0.1",
            "--port", "8081",
            "-c", "32768", // Maximum context for full document analysis
            "--n-gpu-layers", "99"
        ]
        llamaServerProcess?.currentDirectoryURL = URL(fileURLWithPath: projectRoot)
        llamaServerProcess?.standardOutput = FileHandle.nullDevice
        llamaServerProcess?.standardError = FileHandle.nullDevice
        
        do {
            try llamaServerProcess?.run()
            print("✅ llama-server started (PID: \(llamaServerProcess?.processIdentifier ?? 0))")
        } catch {
            print("❌ llama-server failed: \(error)")
        }
    }
    
    private func findFirstModel() -> String? {
        let fm = FileManager.default
        guard fm.fileExists(atPath: modelsPath) else { return nil }
        
        guard let enumerator = fm.enumerator(atPath: modelsPath) else { return nil }
        
        while let file = enumerator.nextObject() as? String {
            if file.hasSuffix(".gguf") {
                return "\(modelsPath)/\(file)"
            }
        }
        return nil
    }
    
    private func startHealthCheck() {
        print("🔍 Starting health check...")
        
        // Immediate check - if port 3000 is already in use, we're ready
        if isPortInUse(port: 3000) {
            print("✅ Port 3000 already active - setting isReady immediately")
            DispatchQueue.main.async {
                self.serviceStatuses["Web Interface"] = .running
                self.isReady = true
                self.statusMessage = ""
            }
            return
        }
        
        var checkCount = 0
        healthCheckTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] timer in
            guard let self = self else { timer.invalidate(); return }
            
            checkCount += 1
            let dots = String(repeating: ".", count: (checkCount % 3) + 1)
            self.statusMessage = "Loading\(dots)"
            print("🔄 Health check #\(checkCount)")
            
            // Simple port-based check
            let port3000Active = self.isPortInUse(port: 3000)
            let port8081Active = self.isPortInUse(port: 8081)
            
            print("   Port 3000: \(port3000Active ? "✅" : "❌"), Port 8081: \(port8081Active ? "✅" : "❌")")
            
            if port3000Active {
                self.serviceStatuses["Web Interface"] = .running
            }
            if port8081Active {
                self.serviceStatuses["AI Engine"] = .running
            }
            
            // Check if Web Interface is ready (primary requirement)
            if self.serviceStatuses["Web Interface"] == .running {
                print("✅ Web Interface ready!")
                self.isReady = true
                self.statusMessage = ""
                timer.invalidate()
            } else if checkCount > 45 {
                // Timeout after 45 seconds
                print("⚠️ Timeout waiting for services")
                self.errorMessage = "Could not start OdaxAI. Please restart the app or check that no other apps are using ports 3002 and 8081."
                timer.invalidate()
            }
        }
    }
    
    private func checkService(url urlString: String, serviceName: String) {
        guard let url = URL(string: urlString) else { return }
        
        var request = URLRequest(url: url)
        request.timeoutInterval = 2.0
        
        URLSession.shared.dataTask(with: request) { [weak self] _, response, _ in
            DispatchQueue.main.async {
                if let httpResponse = response as? HTTPURLResponse,
                   (200...499).contains(httpResponse.statusCode) {
                    if self?.serviceStatuses[serviceName] != .running {
                        print("✅ \(serviceName) is running")
                    }
                    self?.serviceStatuses[serviceName] = .running
                }
            }
        }.resume()
    }
    
    private func startServiceMonitor() {
        print("🛡️ Starting Service Watchdog...")
        serviceMonitorTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            // Check Neural Engine (Port 8081)
            self?.checkAndRestartService(port: 8081, scriptName: "start-llama.sh", serviceName: "Neural Engine")
            
            // Check Dashboard (Port 3000)
            self?.checkAndRestartService(port: 3000, scriptName: "start-dashboard.sh", serviceName: "Dashboard")
        }
    }

    private func checkAndRestartService(port: Int, scriptName: String, serviceName: String) {
        let lsof = Process()
        lsof.executableURL = URL(fileURLWithPath: "/usr/sbin/lsof")
        lsof.arguments = ["-ti:\(port)"]
        
        let pipe = Pipe()
        lsof.standardOutput = pipe
        lsof.standardError = FileHandle.nullDevice
        
        do {
            try lsof.run()
            lsof.waitUntilExit()
            
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            if data.isEmpty {
                print("⚠️ \(serviceName) (Port \(port)) is DOWN. Restarting...")
                self.runScript(scriptName)
            }
        } catch {
            print("❌ Error checking service status: \(error)")
        }
    }
    
    func stopServices() {
        print("🛑 Stopping all services...")
        
        healthCheckTimer?.invalidate()
        serviceMonitorTimer?.invalidate()
        
        dashboardProcess?.terminate()
        odaxChatProcess?.terminate()
        llamaServerProcess?.terminate()
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in
            self?.dashboardProcess?.interrupt()
            self?.odaxChatProcess?.interrupt()
            self?.llamaServerProcess?.interrupt()
        }
        
        cleanupPorts()
        print("✅ All services stopped")
    }
    
    private func cleanupPorts() {
        for port in [3000, 3001, 3002, 8081] {
            let lsof = Process()
            lsof.executableURL = URL(fileURLWithPath: "/usr/sbin/lsof")
            lsof.arguments = ["-ti:\(port)"]
            
            let pipe = Pipe()
            lsof.standardOutput = pipe
            lsof.standardError = FileHandle.nullDevice
            
            do {
                try lsof.run()
                lsof.waitUntilExit()
                
                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                if let output = String(data: data, encoding: .utf8), !output.isEmpty {
                    let pids = output.split(separator: "\n").compactMap { Int($0.trimmingCharacters(in: .whitespaces)) }
                    for pid in pids {
                        kill(pid_t(pid), SIGKILL)
                    }
                }
            } catch {}
        }
    }
    
    deinit {
        stopServices()
    }
}
