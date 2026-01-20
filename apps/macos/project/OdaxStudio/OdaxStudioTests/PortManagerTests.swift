// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

import XCTest
@testable import OdaxStudio

final class PortManagerTests: XCTestCase {

    func testIsPortAvailable_unusedPortReturnsTrue() {
        // Port 59123 is extremely unlikely to be in use
        let available = PortManager.isPortAvailable(59123)
        XCTAssertTrue(available, "Unused high port should be available")
    }

    func testFindAvailablePort_findsOneInRange() {
        let port = PortManager.findAvailablePort(starting: 59200, range: 50)
        XCTAssertNotNil(port, "Should find at least one available port in range 59200-59250")
        if let port = port {
            XCTAssertGreaterThanOrEqual(port, 59200)
            XCTAssertLessThan(port, 59250)
        }
    }

    func testFindAvailablePort_returnsNilForZeroRange() {
        let port = PortManager.findAvailablePort(starting: 59300, range: 0)
        XCTAssertNil(port, "Zero range should return nil")
    }

    func testCheckHealth_invalidURLReturnsFalse() async {
        let result = await PortManager.checkHealth(url: "not-a-url")
        XCTAssertFalse(result, "Invalid URL should return false")
    }

    func testCheckHealth_unreachableHostReturnsFalse() async {
        let result = await PortManager.checkHealth(url: "http://192.0.2.1:1", timeout: 1.0)
        XCTAssertFalse(result, "Unreachable host should return false")
    }
}
