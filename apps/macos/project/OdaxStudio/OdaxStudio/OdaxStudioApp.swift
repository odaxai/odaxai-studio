// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import SwiftUI

// Shared auth manager to communicate between URL handler and WebView
class AuthManager: ObservableObject {
    static let shared = AuthManager()
    @Published var pendingAuthToken: String?
    @Published var googleIdToken: String?
    @Published var googleAccessToken: String?
    @Published var authCallbackReceived = false
    
    func handleAuthCallback(url: URL) {
        print("🔐 Auth callback received: \(url)")
        
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        
        // Handle Google Auth Tokens
        if url.host == "google-auth" {
            googleIdToken = components?.queryItems?.first(where: { $0.name == "id_token" })?.value
            googleAccessToken = components?.queryItems?.first(where: { $0.name == "access_token" })?.value
            
            if googleIdToken != nil {
                print("✅ Extracted Google Tokens")
                authCallbackReceived = true
                return
            }
        }
        
        // Parse the auth token from the URL (legacy/other)
        if let token = components?.queryItems?.first(where: { $0.name == "token" })?.value {
            pendingAuthToken = token
            authCallbackReceived = true
            print("✅ Auth token extracted")
        } else if url.scheme == "odaxstudio" {
            // Just mark callback received, WebView will handle the rest
            authCallbackReceived = true
            print("✅ Auth callback received")
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    func application(_ application: NSApplication, open urls: [URL]) {
        for url in urls {
            print("🔗 AppDelegate received URL: \(url)")
            AuthManager.shared.handleAuthCallback(url: url)
        }
    }
    
    // Prevent opening untitled file on launch
    func applicationShouldOpenUntitledFile(_ sender: NSApplication) -> Bool {
        return true
    }
}

@main
struct OdaxStudioApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var processManager = ProcessManager()
    @StateObject private var authManager = AuthManager.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(processManager)
                .environmentObject(authManager)
                // Prefer this view for handling 'odaxstudio' URLs to prevent new windows
                .handlesExternalEvents(preferring: Set(["odaxstudio"]), allowing: Set(["*"]))
                .onAppear {
                    processManager.startServices()
                    // Configure window
                    DispatchQueue.main.async {
                        if let window = NSApplication.shared.windows.first {
                            window.styleMask.insert([.titled, .resizable, .miniaturizable, .closable])
                            window.titlebarAppearsTransparent = true
                            window.titleVisibility = .hidden
                            window.minSize = NSSize(width: 800, height: 600)
                            window.title = "OdaxAI Studio"
                            window.isOpaque = true
                            window.backgroundColor = NSColor.black
                        }
                    }
                }
                .onDisappear {
                    processManager.stopServices()
                }
        }
        .windowToolbarStyle(.unified)
        .handlesExternalEvents(matching: Set(["*"]))
        .commands {
            CommandGroup(replacing: .newItem) {}
            CommandGroup(replacing: .appInfo) {
                Button("About OdaxAI Studio") {}
            }
        }
    }
}
