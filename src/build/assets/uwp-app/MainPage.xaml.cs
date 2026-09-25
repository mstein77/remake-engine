using Windows.UI.Xaml.Controls;

namespace YourNamespace
{
    public sealed partial class MainPage : Page
    {
        public MainPage()
        {
            InitializeComponent();
            LoadHtml();
        }

        private async void LoadHtml()
        {
            string htmlPath = "ms-appx-web:///index.html";

            await MyWebView.Navigate(new Uri(htmlPath));
        }
    }
}