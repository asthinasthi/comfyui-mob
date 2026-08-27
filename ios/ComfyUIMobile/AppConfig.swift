import Foundation

enum AppConfig {
    /// URL the WebView loads on launch.
    ///
    /// By default this is the copy of the web app bundled inside this iOS app
    /// (folder `Web/`). Loading it locally means:
    ///   • it works offline (the app shell itself needs no network), and
    ///   • the page origin is `file://`, not `https://`, so calls to an
    ///     `http://` ComfyUI server are NOT blocked as mixed content.
    ///
    /// To load the hosted GitHub Pages copy instead, return `hostedWebAppURL`.
    /// Note: a hosted https page talking to an http ComfyUI will hit
    /// mixed-content blocking — prefer the bundled option unless your ComfyUI
    /// is reachable over https.
    static var webAppURL: URL {
        bundledWebAppURL ?? hostedWebAppURL
    }

    static let hostedWebAppURL = URL(string: "https://asthinasthi.github.io/comfyui-mob/")!

    private static var bundledWebAppURL: URL? {
        Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web")
    }
}
