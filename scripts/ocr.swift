import Foundation
import Vision

for path in CommandLine.arguments.dropFirst() {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["zh-Hans", "en-US"]
    request.usesLanguageCorrection = false
    do {
        try VNImageRequestHandler(url: URL(fileURLWithPath: path)).perform([request])
        let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
        let data = try JSONSerialization.data(withJSONObject: ["file": path, "text": lines.joined(separator: "\n")])
        print(String(data: data, encoding: .utf8)!)
    } catch {
        fputs("OCR failed for input page\n", stderr)
        exit(1)
    }
}
