import SwiftUI
import VTrustX

struct ContentView: View {
    @State private var surveyDefinition: NativeSurveyDefinition?
    @State private var surveyResult: [String: Any]?

    var body: some View {
        if let result = surveyResult {
            // Survey Completed State
            VStack {
                Text("Survey Completed!")
                    .font(.title)
                    .padding()
                Text("Responses:")
                    .font(.headline)
                Text("\(result)")
                    .padding()
                Button("Restart") {
                    surveyResult = nil
                }
            }
        } else if let definition = surveyDefinition {
            // Survey Active State
            SurveyView(
                definition: definition,
                onComplete: { responses in
                    print("Survey completed:", responses)
                    self.surveyResult = responses
                },
                onCancel: {
                    print("Survey cancelled")
                }
            )
        } else {
            // Loading State
            ProgressView("Loading survey...")
                .onAppear(perform: loadMockSurvey)
        }
    }

    func loadMockSurvey() {
        // Simulate loading time
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            // Normally load from API
            // For example:
            /*
            let json = """
            {
                "id": "mock-1",
                "title": "Example Survey",
                "screens": [
                    {
                        "id": "s1",
                        "components": [
                            {
                                "id": "q1",
                                "type": "text",
                                "question": "What is your name?",
                                "required": true
                            }
                        ]
                    }
                ]
            }
            """.data(using: .utf8)!
            
            do {
                self.surveyDefinition = try JSONDecoder().decode(NativeSurveyDefinition.self, from: json)
            } catch {
                print("Decode error: \(error)")
            }
            */
            // Since we can't compile VTrustX SDK here, this is a placeholder
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
