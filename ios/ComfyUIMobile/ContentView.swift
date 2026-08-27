import SwiftUI

struct ContentView: View {
    var body: some View {
        WebView(url: AppConfig.webAppURL)
            // Let the web app extend into the safe areas; its CSS uses
            // env(safe-area-inset-*) with viewport-fit=cover to pad itself.
            .ignoresSafeArea()
            .background(Color(red: 0.059, green: 0.067, blue: 0.082))
    }
}
