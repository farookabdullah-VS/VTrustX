import SwiftUI

@available(iOS 14.0, *)
public struct VTrustXSurveyView: View {
    public let definition: NativeSurveyDefinition
    public let onComplete: ([String: Any]) -> Void
    public let onCancel: () -> Void

    @State private var currentScreenId: String
    @State private var answers: [String: AnyCodable] = [:]
    @State private var isComplete: Bool = false

    // SurveyEngine is a class — stable identity, no need for @State
    private let engine: SurveyEngine

    public init(
        definition: NativeSurveyDefinition,
        onComplete: @escaping ([String: Any]) -> Void = { _ in },
        onCancel: @escaping () -> Void = {}
    ) {
        self.definition = definition
        self.onComplete = onComplete
        self.onCancel = onCancel
        self._currentScreenId = State(initialValue: definition.screens.first?.id ?? "")
        self.engine = SurveyEngine(definition: definition)
    }

    public var body: some View {
        NavigationView {
            if isComplete {
                Text("Survey Complete! Thank you.")
                    .font(.title)
                    .navigationTitle(definition.title)
                    .navigationBarTitleDisplayMode(.inline)
            } else if let screen = definition.screens.first(where: { $0.id == currentScreenId }) {
                VStack {
                    ScreenView(
                        screen: screen,
                        definition: definition,
                        answers: $answers
                    )

                    HStack {
                        Spacer()
                        Button(action: nextScreen) {
                            Text("Next")
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding()
                                .background(Color.blue)
                                .cornerRadius(8)
                        }
                        .disabled(!canProceed(screen: screen))
                    }
                    .padding()
                }
                .navigationTitle(definition.title)
                .navigationBarTitleDisplayMode(.inline)
                .navigationBarItems(leading: Button(action: onCancel) {
                    Image(systemName: "xmark")
                        .foregroundColor(.primary)
                })
            } else {
                Text("No screens available.")
                    .navigationTitle(definition.title)
            }
        }
    }

    private func nextScreen() {
        if let nextId = engine.getNextScreen(
            currentScreenId: currentScreenId,
            answers: answers.mapValues { $0.value }
        ) {
            withAnimation {
                currentScreenId = nextId
            }
        } else {
            // Survey complete — fire callback then show completion screen
            withAnimation {
                isComplete = true
            }
            onComplete(answers.mapValues { $0.value })
        }
    }

    private func canProceed(screen: SurveyScreen) -> Bool {
        for component in screen.components {
            if component.required == true && answers[component.id] == nil {
                return false
            }
        }
        return true
    }
}

/// Backward-compatibility alias
@available(iOS 14.0, *)
public typealias SurveyView = VTrustXSurveyView
