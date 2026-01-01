import SwiftUI

struct ContentView: View {
    @EnvironmentObject var processManager: ProcessManager
    @State private var progress: Double = 0.0
    @State private var currentStep = "Starting services..."
    @State private var isWebLoading = true
    
    var body: some View {
        ZStack {
            if processManager.isReady {
                // Show complete OdaxAI Studio interface (Chat App on 3002)
                ZStack {
                    WebView(url: URL(string: "http://localhost:3000")!, isLoading: $isWebLoading)
                        .edgesIgnoringSafeArea(.all)
                        .background(Color.black)
                        .transition(.opacity)
                    
                    if isWebLoading {
                        Color.black.edgesIgnoringSafeArea(.all)
                        VStack(spacing: 20) {
                            ProgressView()
                                .scaleEffect(1.2)
                                .colorScheme(.dark)
                            Text("Connecting...")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))
                        }
                        .transition(.opacity)
                    }
                }
            } else if let errorMessage = processManager.errorMessage {
                // Error screen
                Color.black
                    .edgesIgnoringSafeArea(.all)
                
                ScrollView {
                    VStack(spacing: 20) {
                        Spacer().frame(height: 40)
                        
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 48))
                            .foregroundColor(.orange)
                        
                        Text("Unable to Start")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(.white)
                        
                        // Error message with left alignment for readability
                        Text(errorMessage)
                            .font(.system(size: 12, design: .monospaced))
                            .foregroundColor(.white.opacity(0.8))
                            .multilineTextAlignment(.leading)
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.white.opacity(0.05))
                            .cornerRadius(8)
                            .padding(.horizontal, 40)
                        
                        // Retry button
                        Button(action: {
                            processManager.startServices()
                        }) {
                            HStack {
                                Image(systemName: "arrow.clockwise")
                                Text("Retry")
                            }
                            .padding(.horizontal, 24)
                            .padding(.vertical, 10)
                            .background(Color.green)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        }
                        .buttonStyle(PlainButtonStyle())
                        .padding(.top, 10)
                        
                        Spacer().frame(height: 40)
                    }
                }
            } else {
                // Loading screen
                Color.black
                    .edgesIgnoringSafeArea(.all)
                
                VStack(spacing: 32) {
                    // OdaxAI logo
                    if let logoImage = NSImage(named: "odaxai-logo") {
                        Image(nsImage: logoImage)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 80, height: 80)
                    } else {
                        Image(systemName: "brain.head.profile")
                            .font(.system(size: 64))
                            .foregroundColor(.white.opacity(0.9))
                    }
                    
                    VStack(spacing: 5) {
                        Text("OdaxAI Technology")
                            .font(.system(size: 18, weight: .medium, design: .rounded))
                            .foregroundColor(.white)
                            .tracking(1.5)
                        
                        Text("Copyright © 2026")
                            .font(.system(size: 10, weight: .regular))
                            .foregroundColor(.white.opacity(0.4))
                    }
                    .opacity(0.9)
                    
                    // Progress bar
                    VStack(spacing: 12) {
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.white.opacity(0.1))
                                    .frame(height: 4)
                                
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.green)
                                    .frame(width: geometry.size.width * CGFloat(progress), height: 4)
                                    .animation(.linear(duration: 0.3), value: progress)
                            }
                        }
                        .frame(height: 4)
                        .frame(maxWidth: 240)
                        
                        Text(processManager.statusMessage.isEmpty ? currentStep : processManager.statusMessage)
                            .font(.system(size: 11, weight: .regular))
                            .foregroundColor(.white.opacity(0.6))
                            .padding(.top, 4)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .transition(.opacity)
                .onAppear {
                    simulateProgress()
                }
            }
        }
        .animation(.easeInOut(duration: 0.5), value: processManager.isReady)
        .animation(.easeInOut(duration: 0.3), value: processManager.errorMessage)
    }
    
    @ViewBuilder
    private func statusIcon(for status: ServiceStatus) -> some View {
        switch status {
        case .running:
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
                .font(.system(size: 12))
        case .starting:
            ProgressView()
                .scaleEffect(0.5)
                .frame(width: 12, height: 12)
        case .failed:
            Image(systemName: "xmark.circle.fill")
                .foregroundColor(.red)
                .font(.system(size: 12))
        case .stopped:
            Image(systemName: "circle")
                .foregroundColor(.gray)
                .font(.system(size: 12))
        }
    }
    
    private func simulateProgress() {
        let steps = [
            (0.2, "Checking services..."),
            (0.5, "Connecting to web server..."),
            (0.8, "Loading OdaxAI Studio..."),
            (1.0, "Ready!")
        ]
        
        for (index, step) in steps.enumerated() {
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(index) * 0.5) {
                withAnimation {
                    self.progress = step.0
                    self.currentStep = step.1
                }
            }
        }
    }
}
