import SwiftUI

@main
struct OdaxStudioApp: App {
    @StateObject private var processManager = ProcessManager()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(processManager)
                .onAppear {
                    processManager.startServices()
                    // Configure window - Keep native controls but make titlebar minimal
                    DispatchQueue.main.async {
                        if let window = NSApplication.shared.windows.first {
                            // Keep standard window controls (red, yellow, green buttons)
                            window.styleMask.insert([.titled, .resizable, .miniaturizable, .closable])

                            // Make title bar transparent and very thin
                            window.titlebarAppearsTransparent = true
                            window.titleVisibility = .hidden

                            // Set reasonable min size
                            window.minSize = NSSize(width: 800, height: 600)

                            // Set title (for system)
                            window.title = "OdaxAI Studio"

                            // Keep window opaque with black background
                            window.isOpaque = true
                            window.backgroundColor = NSColor.black

                            print("✅ Window configured - titlebar transparent, controls visible")
                        }
                    }
                }
                .onDisappear {
                    processManager.stopServices()
                }
        }
        // REMOVED .windowStyle(.hiddenTitleBar) to restore native dragging
        .windowToolbarStyle(.unified)
        .commands {
            CommandGroup(replacing: .appInfo) {
                Button("About OdaxAI Studio") {
                    // Show about dialog
                }
            }
        }
    }
}
