// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import Foundation

/// Utility class for port management and detection
class PortManager {
    
    /// Check if a port is available (not in use)
    static func isPortAvailable(_ port: Int) -> Bool {
        let socket = Darwin.socket(AF_INET, SOCK_STREAM, 0)
        guard socket >= 0 else { return false }
        defer { close(socket) }
        
        var addr = sockaddr_in()
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = in_port_t(port).bigEndian
        addr.sin_addr.s_addr = INADDR_ANY
        
        let result = withUnsafePointer(to: &addr) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                bind(socket, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        return result == 0
    }
    
    /// Find an available port starting from a given port
    static func findAvailablePort(starting: Int, range: Int = 100) -> Int? {
        for port in starting..<(starting + range) {
            if isPortAvailable(port) {
                return port
            }
        }
        return nil
    }
    
    /// Check if a service is responding on a given URL
    static func checkHealth(url: String, timeout: TimeInterval = 2.0) async -> Bool {
        guard let url = URL(string: url) else { return false }
        
        var request = URLRequest(url: url)
        request.timeoutInterval = timeout
        request.httpMethod = "GET"
        
        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            if let httpResponse = response as? HTTPURLResponse {
                return (200...399).contains(httpResponse.statusCode)
            }
            return false
        } catch {
            return false
        }
    }
    
    /// Wait for a service to become available with retry
    static func waitForService(url: String, maxRetries: Int = 30, delaySeconds: Double = 1.0) async -> Bool {
        for _ in 0..<maxRetries {
            if await checkHealth(url: url) {
                return true
            }
            try? await Task.sleep(nanoseconds: UInt64(delaySeconds * 1_000_000_000))
        }
        return false
    }
}
