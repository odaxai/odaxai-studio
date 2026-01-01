import SwiftUI
import WebKit

struct WebView: NSViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let preferences = WKPreferences()
        preferences.javaScriptEnabled = true
        
        config.preferences = preferences
        // CRITICAL: Enable window.open() support
        config.preferences.javaScriptCanOpenWindowsAutomatically = true
        
        // Add message handler for native bridge
        let contentController = WKUserContentController()
        contentController.add(context.coordinator, name: "odaxBridge")
        
        // Inject JavaScript bridge with Google Sign-In support - MUST be before creating WebView
        let bridgeScript = """
        window.odax = {
            googleSignIn: function() {
                return new Promise((resolve, reject) => {
                    window._googleResolve = resolve;
                    window._googleReject = reject;
                    window.webkit.messageHandlers.odaxBridge.postMessage({action: 'googleSignIn'});
                });
            }
        };
        console.log('✅ OdaxBridge injected with Google Sign-In');
        """
        let userScript = WKUserScript(source: bridgeScript, injectionTime: .atDocumentStart, forMainFrameOnly: false)
        contentController.addUserScript(userScript)
        
        config.userContentController = contentController
        
        // ENABLE WEB INSPECTOR for debugging
        #if DEBUG
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        #endif
        
        let webView = WKWebView(frame: .zero, configuration: config)
        
        // ENABLE INSPECTOR
        if #available(macOS 13.3, *) {
            webView.isInspectable = true
        }
        
        // Set UI delegate to handle window.open()
        webView.uiDelegate = context.coordinator
        webView.navigationDelegate = context.coordinator
        
        // ELIMINATE WHITE FLASH: Make WebView background transparent/black
        webView.setValue(false, forKey: "drawsBackground")
        if webView.responds(to: Selector(("setBackgroundColor:"))) {
            webView.perform(Selector(("setBackgroundColor:")), with: NSColor.black)
        }
        
        print("🌐 WebView loading URL: \(url)")
        
        // Allow only localhost navigation
        webView.load(URLRequest(url: url))
        
        context.coordinator.webView = webView
        
        return webView
    }
    
    func updateNSView(_ nsView: WKWebView, context: Context) {
        // Update coordinator's parent reference to access current bindings
        context.coordinator.parent = self
    }
    
    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        var parent: WebView
        weak var webView: WKWebView?
        
        init(_ parent: WebView) {
            self.parent = parent
        }
        
        // Handle messages from JavaScript
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "odaxBridge" {
                guard let body = message.body as? [String: Any],
                      let action = body["action"] as? String else {
                    return
                }
                
                if action == "googleSignIn" {
                    // Open Chrome with Google OAuth login page
                    let loginURL = URL(string: "http://localhost:3002/login?action=google")!
                    print("🔐 Opening Chrome for Google Sign-In: \(loginURL)")
                    
                    // Try to open in Chrome specifically
                    let chromeURL = URL(fileURLWithPath: "/Applications/Google Chrome.app")
                    let configuration = NSWorkspace.OpenConfiguration()
                    NSWorkspace.shared.open([loginURL], withApplicationAt: chromeURL, configuration: configuration) { app, error in
                        if let error = error {
                            print("❌ Error opening Chrome: \(error.localizedDescription)")
                            // Fallback to default browser
                            NSWorkspace.shared.open(loginURL)
                        } else {
                            print("✅ Chrome opened for login")
                        }
                    }
                }
            }
        }
        
        // Restrict navigation - allow localhost and Google OAuth
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = navigationAction.request.url, let host = url.host {
                print("🔍 Navigation request to: \(url)")
                
                // List of allowed hosts for OAuth flow
                let allowedHosts = [
                    "localhost", "127.0.0.1",
                    "accounts.google.com", "www.google.com",
                    "odaxai-cloud.firebaseapp.com",
                    "apis.google.com"
                ]
                
                let isAllowed = allowedHosts.contains { host.contains($0) }
                
                if isAllowed {
                    print("✅ Allowing navigation to: \(url)")
                    decisionHandler(.allow)
                } else {
                    print("❌ Blocking navigation to: \(url)")
                    decisionHandler(.cancel)
                }
            } else {
                print("❌ Navigation with no URL")
                decisionHandler(.cancel)
            }
        }
        
        // Log failed navigation
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            print("❌ WebView navigation failed: \(error.localizedDescription)")
            DispatchQueue.main.async {
                self.parent.isLoading = false
            }
        }
        
        // Log provisional navigation failures
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            print("❌ WebView provisional navigation failed: \(error.localizedDescription)")
            DispatchQueue.main.async {
                self.parent.isLoading = false
            }
        }
        
        // Handle window.open() calls - create actual popup window for OAuth
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            guard let url = navigationAction.request.url else { return nil }
            print("🔗 Popup request for: \(url)")
            
            // Check if it's a Google OAuth URL - create popup window
            if let host = url.host, 
               (host.contains("google.com") || host.contains("firebaseapp.com") || host.contains("accounts.google")) {
                print("✅ Creating popup window for OAuth")
                
                // Create popup WebView with the same configuration
                let popupWebView = WKWebView(frame: .zero, configuration: configuration)
                popupWebView.navigationDelegate = self
                popupWebView.uiDelegate = self
                
                // Create popup window
                let popupWindow = NSWindow(
                    contentRect: NSRect(x: 0, y: 0, width: 500, height: 600),
                    styleMask: [.titled, .closable, .resizable],
                    backing: .buffered,
                    defer: false
                )
                popupWindow.title = "Sign in with Google"
                popupWindow.contentView = popupWebView
                popupWindow.center()
                popupWindow.makeKeyAndOrderFront(nil)
                
                // Store reference to prevent deallocation
                objc_setAssociatedObject(popupWebView, "popupWindow", popupWindow, .OBJC_ASSOCIATION_RETAIN)
                
                return popupWebView
            } else if url.host == "localhost" || url.host == "127.0.0.1" {
                // For localhost redirects, load in main webview
                print("✅ Loading localhost redirect in main WebView")
                webView.load(URLRequest(url: url))
                return nil
            } else {
                // For other URLs, open in external browser
                print("🌐 Opening in external browser: \(url)")
                NSWorkspace.shared.open(url)
                return nil
            }
        }
        
        // Close popup window when navigation completes (after auth callback)
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("✅ WebView finished loading: \(webView.url?.absoluteString ?? "unknown")")
            
            DispatchQueue.main.async {
                withAnimation {
                    self.parent.isLoading = false
                }
            }
            
            // Check if this is a popup webview and if we're back on localhost (auth complete)
            if let url = webView.url, 
               (url.host == "localhost" || url.host == "127.0.0.1"),
               let popupWindow = objc_getAssociatedObject(webView, "popupWindow") as? NSWindow {
                print("🎉 OAuth complete, closing popup")
                popupWindow.close()
            }
        }
    }
}
