// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "VTrustX",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "VTrustX",
            targets: ["VTrustX"]),
    ],
    dependencies: [
        // Dependencies go here (e.g. Alamofire for networking)
    ],
    targets: [
        .target(
            name: "VTrustX",
            dependencies: [],
            path: "Sources/VTrustX"),
    ]
)
