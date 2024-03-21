import SwiftUI
import WebKit

struct ContentView: View {
    var body: some View {
        let url = Bundle.main.url(forResource: "index", withExtension: "html")!

        return AnyView(WebView(url: url)
                        .focusable(true)
                        .onAppear {
                            DispatchQueue.main.async {
                                NSApplication.shared.windows.first?.makeFirstResponder(nil)
                            }
                        })
    }
}

struct WebView: NSViewRepresentable {
    let url: URL

    func makeNSView(context: Context) -> WKWebView {
        let preferences = WKPreferences()
        let configuration = WKWebViewConfiguration()
        configuration.preferences = preferences
        let webPageDefaultPrefs = WKWebpagePreferences()
        webPageDefaultPrefs.allowsContentJavaScript = true
        configuration.defaultWebpagePreferences = webPageDefaultPrefs

        let webView = WKWebView(frame: .zero, configuration: configuration)
        let request = URLRequest(url: url)
        webView.load(request)

        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {
        // Update code if needed
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!

    func applicationDidFinishLaunching(_ notification: Notification) {
        let contentView = ContentView()

        // Create the window and set the content view.
        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 800, height: 600),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered, defer: false)
        window.center()
        window.setFrameAutosaveName("Main Window")
        window.contentView = NSHostingView(rootView: contentView)
        window.makeKeyAndOrderFront(nil)
    }
}

let appDelegate = AppDelegate()
NSApplication.shared.delegate = appDelegate
_ = NSApplicationMain(CommandLine.argc, CommandLine.unsafeArgv)