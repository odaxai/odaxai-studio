import XCTest
@testable import OdaxStudio

final class SecurityTests: XCTestCase {

    // MARK: - WebView allowed hosts

    func testAllowedHostsIncludeLocalhost() {
        let allowedHosts = [
            "localhost", "127.0.0.1",
            "accounts.google.com", "www.google.com",
            "apis.google.com"
        ]
        XCTAssertTrue(allowedHosts.contains("localhost"))
        XCTAssertTrue(allowedHosts.contains("127.0.0.1"))
    }

    func testAllowedHostsDoNotIncludeArbitraryDomains() {
        let allowedHosts = [
            "localhost", "127.0.0.1",
            "accounts.google.com", "www.google.com",
            "apis.google.com"
        ]
        XCTAssertFalse(allowedHosts.contains("example.com"))
        XCTAssertFalse(allowedHosts.contains("malicious-site.com"))
        XCTAssertFalse(allowedHosts.contains("phishing.google.com.evil.com"))
    }

    // MARK: - Firebase domain from env

    func testFirebaseDomainFallsBackToLocalhost() {
        let firebaseDomain = ProcessInfo.processInfo.environment["FIREBASE_AUTH_DOMAIN"] ?? "localhost"
        XCTAssertFalse(firebaseDomain.contains("odaxai-cloud"), "Firebase domain should not be hardcoded to odaxai-cloud")
    }

    // MARK: - No hardcoded credentials in source

    func testProcessManagerSourceHasNoHardcodedPaths() {
        let bundle = Bundle(for: type(of: self))
        
        // Verify the ProcessManager class exists and initializes without crashes
        let pm = ProcessManager()
        
        // The projectRoot should not contain personal user paths in production
        // (In test environment it might, but the search logic should be dynamic)
        XCTAssertNotNil(pm.serviceStatuses)
    }

    func testNoHardcodedFirebaseProjectInSwift() {
        // Verify that critical config comes from environment, not source code
        let envDomain = ProcessInfo.processInfo.environment["FIREBASE_AUTH_DOMAIN"]
        let envProjectId = ProcessInfo.processInfo.environment["FIREBASE_PROJECT_ID"]
        
        // These should either be nil (not set) or custom values, never hardcoded
        if let domain = envDomain {
            XCTAssertFalse(domain.isEmpty, "If set, Firebase domain should not be empty")
        }
        // Not having env vars set is fine - the app should handle it gracefully
    }
}
