import { render } from 'preact';
import App from './ui/App';
import './ui.css';
import './deck.css';

if (import.meta.env.PROD) {
  const measurementId = 'G-SPKTEYVP17';
  const analyticsWindow = window as Window & {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  };
  analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? [];
  const gtag = (...args: unknown[]) => analyticsWindow.dataLayer!.push(args);
  analyticsWindow.gtag = gtag;

  gtag('js', new Date());
  gtag('config', measurementId, { send_page_view: false });

  const sendPageView = () => {
    const isCompare = location.hash.replace('#', '') === '/compare';
    gtag('event', 'page_view', {
      page_title: isCompare ? 'キャラクター査定比較 | パワクエコーチ計算機(仮)' : 'パワクエコーチ計算機(仮)',
      page_location: location.href,
      page_path: `${location.pathname}${location.search}${location.hash}`,
    });
  };
  sendPageView();
  addEventListener('hashchange', sendPageView);

  const googleTag = document.createElement('script');
  googleTag.async = true;
  googleTag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.append(googleTag);
}

render(<App />, document.getElementById('app')!);
