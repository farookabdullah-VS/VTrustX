import SwiftUI

@available(iOS 14.0, *)
public struct ComponentView: View {
    public let component: SurveyComponent
    @Binding public var answer: AnyCodable?

    public init(component: SurveyComponent, answer: Binding<AnyCodable?>) {
        self.component = component
        self._answer = answer
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(component.label)
                .font(.headline)

            switch component.type {
            case .text:
                TextField(component.placeholder ?? "Enter text...", text: Binding(
                    get: { (answer?.value as? String) ?? "" },
                    set: { answer = AnyCodable($0) }
                ))
                .textFieldStyle(RoundedBorderTextFieldStyle())

            case .multilineText:
                MultilineTextView(
                    placeholder: component.placeholder ?? "Enter text...",
                    answer: $answer
                )

            case .number:
                NumberInputView(
                    placeholder: component.placeholder ?? "Enter a number",
                    answer: $answer
                )

            case .rating:
                RatingView(
                    max: Int(component.max ?? 5),
                    rating: Binding(
                        get: { (answer?.value as? Int) ?? 0 },
                        set: { answer = AnyCodable($0) }
                    )
                )

            case .nps:
                NPSView(
                    score: Binding(
                        get: { answer?.value as? Int },
                        set: { if let val = $0 { answer = AnyCodable(val) } }
                    )
                )

            case .singleChoice:
                SingleChoiceView(
                    options: component.options ?? [],
                    answer: $answer
                )

            case .multipleChoice:
                MultipleChoiceView(
                    options: component.options ?? [],
                    answer: $answer
                )

            case .date:
                DatePickerView(answer: $answer)

            case .slider:
                SliderView(
                    min: component.min ?? 0,
                    max: component.max ?? 100,
                    step: component.step ?? 1,
                    answer: $answer
                )

            case .fileUpload:
                FileUploadPlaceholderView(answer: $answer)
            }
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

// MARK: - Rating

@available(iOS 14.0, *)
struct RatingView: View {
    let max: Int
    @Binding var rating: Int

    var body: some View {
        HStack {
            ForEach(1...max, id: \.self) { index in
                Image(systemName: index <= rating ? "star.fill" : "star")
                    .foregroundColor(.yellow)
                    .onTapGesture { rating = index }
            }
        }
        .font(.title)
    }
}

// MARK: - NPS

@available(iOS 14.0, *)
struct NPSView: View {
    @Binding var score: Int?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(0...10, id: \.self) { index in
                    Button(action: { score = index }) {
                        Text("\(index)")
                            .font(.system(size: 14, weight: .bold))
                            .frame(width: 36, height: 36)
                            .background(score == index ? Color.blue : Color.gray.opacity(0.2))
                            .foregroundColor(score == index ? .white : .black)
                            .clipShape(Circle())
                    }
                }
            }
            .padding(.vertical, 4)
        }
    }
}

// MARK: - Single Choice

@available(iOS 14.0, *)
struct SingleChoiceView: View {
    let options: [ChoiceOption]
    @Binding var answer: AnyCodable?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(options, id: \.value) { option in
                HStack {
                    Image(systemName: (answer?.value as? String) == option.value
                          ? "largecircle.fill.circle"
                          : "circle")
                        .foregroundColor(.blue)
                    Text(option.label)
                    Spacer()
                }
                .contentShape(Rectangle())
                .onTapGesture { answer = AnyCodable(option.value) }
                .padding(.vertical, 4)
            }
        }
    }
}

// MARK: - Multiple Choice

@available(iOS 14.0, *)
struct MultipleChoiceView: View {
    let options: [ChoiceOption]
    @Binding var answer: AnyCodable?

    private var selected: [String] {
        (answer?.value as? [String]) ?? []
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(options, id: \.value) { option in
                HStack {
                    Image(systemName: selected.contains(option.value)
                          ? "checkmark.square.fill"
                          : "square")
                        .foregroundColor(.blue)
                    Text(option.label)
                    Spacer()
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    var current = selected
                    if let idx = current.firstIndex(of: option.value) {
                        current.remove(at: idx)
                    } else {
                        current.append(option.value)
                    }
                    answer = AnyCodable(current)
                }
                .padding(.vertical, 4)
            }
        }
    }
}

// MARK: - Date Picker

@available(iOS 14.0, *)
struct DatePickerView: View {
    @Binding var answer: AnyCodable?

    @State private var date: Date = Date()

    private static let iso8601: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        return f
    }()

    var body: some View {
        DatePicker("", selection: Binding(
            get: {
                if let str = answer?.value as? String,
                   let parsed = Self.iso8601.date(from: str) {
                    return parsed
                }
                return date
            },
            set: { newDate in
                date = newDate
                answer = AnyCodable(Self.iso8601.string(from: newDate))
            }
        ), displayedComponents: .date)
        .datePickerStyle(.graphical)
        .labelsHidden()
    }
}

// MARK: - Multiline Text

@available(iOS 14.0, *)
struct MultilineTextView: View {
    let placeholder: String
    @Binding var answer: AnyCodable?

    var body: some View {
        ZStack(alignment: .topLeading) {
            if (answer?.value as? String)?.isEmpty ?? true {
                Text(placeholder)
                    .foregroundColor(Color(.placeholderText))
                    .padding(.horizontal, 4)
                    .padding(.vertical, 8)
            }
            TextEditor(text: Binding(
                get: { (answer?.value as? String) ?? "" },
                set: { answer = AnyCodable($0) }
            ))
            .frame(minHeight: 100)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
            )
        }
    }
}

// MARK: - Number Input

@available(iOS 14.0, *)
struct NumberInputView: View {
    let placeholder: String
    @Binding var answer: AnyCodable?

    var body: some View {
        TextField(placeholder, text: Binding(
            get: {
                switch answer?.value {
                case let d as Double:
                    return d == d.rounded() ? String(Int(d)) : String(d)
                case let i as Int:
                    return String(i)
                default:
                    return ""
                }
            },
            set: { text in
                if let d = Double(text) {
                    answer = AnyCodable(d)
                } else if text.isEmpty {
                    answer = nil
                }
            }
        ))
        .keyboardType(.decimalPad)
        .textFieldStyle(RoundedBorderTextFieldStyle())
    }
}

// MARK: - Slider

@available(iOS 14.0, *)
struct SliderView: View {
    let min: Double
    let max: Double
    let step: Double
    @Binding var answer: AnyCodable?

    private var currentValue: Double {
        (answer?.value as? Double) ?? min
    }

    var body: some View {
        VStack(spacing: 4) {
            HStack {
                Text(String(Int(min)))
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
                Text(String(format: step < 1 ? "%.1f" : "%.0f", currentValue))
                    .font(.body.bold())
                Spacer()
                Text(String(Int(max)))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Slider(
                value: Binding(
                    get: { currentValue },
                    set: { answer = AnyCodable($0) }
                ),
                in: min...max,
                step: step
            )
        }
    }
}

// MARK: - File Upload Placeholder

@available(iOS 14.0, *)
struct FileUploadPlaceholderView: View {
    @Binding var answer: AnyCodable?

    var body: some View {
        Button(action: {
            // Full implementation requires UIDocumentPickerViewController
            // which must be presented from a UIViewController context.
        }) {
            HStack {
                Image(systemName: "doc.badge.plus")
                Text(answer != nil ? "File selected" : "Choose file...")
            }
            .frame(maxWidth: .infinity)
            .padding()
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.blue, lineWidth: 1)
            )
        }
    }
}
