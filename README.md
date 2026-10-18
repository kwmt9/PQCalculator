# PQCalculator

パワクエ契約書キャラクターの査定計算と比較を行う、TypeScript + Preact + Vite製の静的SPAです。計算はブラウザー内で完結し、比較リストと未所持キャラ設定は`localStorage`に保存します。

## 開発

```sh
npm ci
npm run dev
```

## GitHub Pages

PagesのBuild and deploymentでSourceを「GitHub Actions」に設定し、`main`または`master`へpushしてください。ワークフローが`dist`をビルドして公開します。プロジェクトサイトのURLが`https://<user>.github.io/PQCalculator/`の場合、`vite.config.ts`の`base`は`/PQCalculator/`です。ユーザーサイトやカスタムドメインを使う場合は`/`に変更してください。

## データ

`public/data/`にはキャラクター、コーチ、査定JSONを配置しています。ブラウザーから静的ファイルとして取得します。
