import SwiftUI
import WebKit

/// Thin SwiftUI wrapper around WKWebView that hosts the ComfyUI Mobile web app.
struct WebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()

        // Allow the bundled file:// app shell to make cross-origin fetch/XHR
        // calls to the ComfyUI server. These KVC keys are the standard way to
        // relax WKWebView's file-origin restrictions; without them the web
        // app's API calls from a file:// page are blocked.
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        config.setValue(true, forKey: "allowUniversalAccessFromFileURLs")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.allowsBackForwardNavigationGestures = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.isOpaque = false
        // Match the web app background (#0f1115) so there's no white flash.
        webView.backgroundColor = UIColor(red: 0.059, green: 0.067, blue: 0.082, alpha: 1)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard webView.url == nil else { return }
        if url.isFileURL {
            // Grant read access to the whole Web/ folder so linked assets load.
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        } else {
            webView.load(URLRequest(url: url))
        }
    }
}
