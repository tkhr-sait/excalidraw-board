## 計画

```
excalidrawを利用した、リアルタイムコラボレーションをclaude codeを利用して実現するための作業計画をdocs/plan.md、claude codeに渡す作業単位でdocs/tasks/task-{00}-{taskname}.mdとして作成したい
  - 段階的に考えて
  - プロジェクト名は excalidraw-board
  - フロントエンドは、excalidraw本体リポジトリの改造ではなく、新規で作成
  - githubのexcalidraw公式リポジトリで採用されている方式を可能な限り踏襲する
    - excalidraw-app/App.tsx
    - excalidraw-app/collab/Collab.tsx
  - バックエンドはdockerhubのexcalidraw公式のexcalidraw-roomを無改造で利用
  - ローカルネットワークのみでセルフホスティング可能。ドメイン名、証明書なども外部サービス利用しない
  - コード作成前にテストコードを作成
  - 技術的な不明点は、簡易的なサンプル実装をおこなってから採用
  - 調査結果、サンプル実装などもリポジトリに保持し、adr管理する
  - ドキュメントは日本語ベースで管理
  - 機能追加などは現時点で計画しない
  - playwrightをheadlessで利用
```

## タスク実行

### task-01 project setup

- 実施

```
@docs/tasks/task-01-project-setup.md
```

- 検証

```
@docs/tasks/task-01-project-setup.md の検証項目を確認し、対応状況を更新してください
```

### task-02 docker setup

- 実施＆検証

```
@docs/tasks/task-02-docker-setup.md を実施後、検証項目を確認し、対応状況を更新してください
```

- docker が利用不可の状態で実施＆検証したところ、検証スキップされてしまったので docker 環境構築してリトライ
  - devcontainer で `features: docker-in-docker` を指定するだけ

```
docker を利用可能としたので、@docs/tasks/task-02-docker-setup.mdの検証を再度行ってください
```

### task-03 excalidraw integration

- 実施＆検証

```
@docs/tasks/task-03-excalidraw-integration.md の検証項目を確認し、対応状況を更新してください
```

- 画面確認したところ、レイアウトがおかしい

```
excalidrawのcssが適用されていないので確認
```

- 修正後確認しようとしたが、画面真っ白。ブラウザのコンソールにエラーがあった

```
 ブラウザアクセスしたところエラー。playwrightで動作確認、エラーログ確認し、解消してください
```

- @docs/tasks/task-03-excalidraw-integration.md が更新されていなかったので、再度指示

```
@docs/tasks/task-03-excalidraw-integration.md の検証項目・成果物を確認し、対応状況を更新してください
```

### task-04 socketio client

- 実施＆検証

```
@docs/tasks/task-04-socketio-client.md を実施後、検証項目を確認し、対応状況を更新してください
```

### task-05 collaboration component

- 実施＆検証

```
@docs/tasks/task-05-collaboration-component.md を実施後、検証項目を確認し、対応状況を更新してください
```

- e2e スキップされてたので追加指示

```
excalidraw-roomをdocker compose起動し、e2eテストも実施してください
```

- ドキュメント更新

```
@docs/tasks/task-05-collaboration-component.md の検証項目を確認し、対応状況を更新してください
```

### task-06 realtime sync

- 実施＆検証

```
@docs/tasks/task-06-realtime-sync.md を実施後、検証項目を確認し、対応状況を更新してください
```

### task-07 unit tests

- 実施＆検証

```
@docs/tasks/task-07-unit-tests.md の検証項目を確認し、対応状況を更新してください
```

### task-08 e2e tests

- 実施＆検証

```
@docs/tasks/task-08-e2e-tests.md の検証項目を確認し、対応状況を更新してください
```

### task-09 performance optimization

- 実施＆検証

```
@docs/tasks/task-09-performance-optimization.md の検証項目を確認し、対応状況を更新してください
```

- 一部未対応だが許容する
  ```
  5. ⚠️ バンドル解析ツール (vite.config.tsに設定要、但し現状でもバンドル分析は可能)
  6. ⚠️ メモリプロファイリングスクリプト (puppeteerベースの専用スクリプト未実装)
  ```

### task-10 production config

- 実施＆検証

```
@docs/tasks/task-10-production-config.md を実施後、検証項目を確認し、対応状況を更新してください
```

### task-11 deployment docs

- 実施＆検証

```
@docs/tasks/task-11-deployment-docs.md を実施後、検証項目を確認し、対応状況を更新してください
```

### task-12 final testing

- 実施＆検証

```
@docs/tasks/task-12-final-testing.md を実施後、検証項目を確認し、対応状況を更新してください
```

## 結果

- それっぽい雰囲気のものはできたが、リアルタイムコラボレーションは実現できてない...🤮

## fix リアルタイムコラボレーション

- excalidraw の方式と合わせるため、clone した内容を参照させる

```
@/tmp/excalidraw の excalidraw-roomとの通信方法をリポジトリに適用してください。firebaseは関連処理は今回対応不要
```

- ダメだったので修正

```
ブラウザ２つ立ち上げてリアルタイムコラボレーションを試しましたが、四角などの図形描画が同期されません。playwrightで動作確認とコンソールの確認を行い、同期されるよう修正してください。
```

- ウィンドウタイトルなど調整

```
ウィンドウタイトルを excalidraw-board + room名 + ユーザ名とする。room名、ユーザ名は初期値ランダム、ユーザ名は記憶
```

- docker compose でもできるように

```
docker/docker-compose.yml で起動した場合、Roomにjoinできない
```

## fix リアルタイムコラボレーション２

- リアルタイムコラボレーションが動かなくなっていたので修正

```
│ > ブラウザ２つ立ち上げてリアルタイムコラボレーションを試しましたが、四角などの図形描画が同期されません。playwrightで動作確認とコンソールの確認を行い、同期されるよう修正してください。
│ > @/tmp/excalidraw の excalidraw-roomとの通信方法をリポジトリに適用してください。firebaseは関連処理は今回対応不要
│ > リアルタイムコラボレーション機能を完成させ、playwrightで動作確認してください
│ > ブラウザ２つ立ち上げてリアルタイムコラボレーションを試しましたが、四角などの図形描画が同期されません。playwrightで動作確認とコンソールの確認を行い、同期されるよう修正してください。
│ > 図形描画の同期については、実際の描画操作時にhandleChangeが適切な要素データを受け取れるよう、@/tmp/excalidraw の collab の通信方法をリポジトリに適用してください。 use context7
│ > excalidraw の LiveCollaborationTrigger を利用する。use context7
│ > ブラウザ２つ立ち上げてリアルタイムコラボレーションを試しましたが、四角などの図形描画が同期されません。playwrightで動作確認とコンソールの確認を行い、同期されるよう修正してください。
│ > docker-compose.yml docker-compose.dev.yml 見直し
│ > excalidraw に用意されている LiveCollaborationTriggerと、接続状態の表示はカスタムツールバーを利用してください。use context7
│ > playwrightでe2e動作確認してください
│ > docker compose -f docker/docker-compose.yml up でエラー。target websocket-server: failed to solve: process "/bin/sh -c npm ci --only=production" did not complete successfully: exit code: 1
│ > @docker/docker-compose.yml のwebsocket-serverはexcalidraw-roomを利用するよう変更。use context7
│ > collabのイベント名を https://github.com/excalidraw/excalidraw-room/blob/master/src/index.ts のイベント名に合わせる
│ > ブラウザで起動したところエラー。playwrightで確認しつつ修正してください。Uncaught SyntaxError: The requested module '/src/components/collab/Collab.tsx' does not provide an export named 'CollabHandle' (at App.tsx:15:18)
│ > playwrightでe2e動作確認してください
│ > ブラウザ２つ立ち上げてリアルタイムコラボレーションを試しましたが、四角などの図形描画が同期されません。playwrightで動作確認とコンソールの確認を行い、同期されるよう修正してください。
│ > ブラウザで起動したところエラー。playwrightで確認しつつ修正してください。socket__io-client.js?v=a6be85a5:1059 WebSocket connection to 'ws://localhost:3002/socket.io/?EIO=4&transport=websocket' failed:
│ > リアルタイム図形同期は成功しましたが、図形サイズが最小となっている
```

- ツールバー整理

```
│ > CollabToolbarを、excalidrawのFooterで実現してください。use context7
│ > 関連するテストを修正してください
│ > エラー。playwrightを確認し修正してください。
│ > FooterにはJoin Roomを表示せず、画面右上の Shareボタンのみで接続制御するようにしてください
│ > excalidrawのLiveCollaborationTrigger仕様を確認し、共同編集者の数が表示されるようにしてください use context7
│ > Footerは１行に収まるよう表示をコンパクトにする。ユーザ名は１文字アイコンのみとし、人数多い場合は省略。全量はtooltipなどで見えるようにする。
│ > Room共有をURLで行えるようにする。FooterのRoom表示でURLコピー可能
│ > URL経由のログインの場合、Shareボタンを押さないと、Collaboratingにならない。playwrightで確認し、修正してください
│ > playwrightのe2eテストの過不足を確認し、テストケース修正、正常終了することを確認する。
```

- 動作修正.. 不毛..

```
│ > リアルタイムコラボレーションの図形描画などの方式を @/tmp/excalidraw/excalidraw-app/App.tsx @/tmp/excalidraw/excalidraw-app/collab と同一になるよう修正し、playwrightで動作確認してください
│ > リアルタイムコラボレーションの競合解決の方式を @/tmp/excalidraw/excalidraw-app/App.tsx @/tmp/excalidraw/excalidraw-app/collab と同一になるよう修正し、playwrightで動作確認してください
│ > リアルタイムコラボレーションのマウス位置共有の方式を @/tmp/excalidraw/excalidraw-app/App.tsx @/tmp/excalidraw/excalidraw-app/collab と同一になるよう修正し、playwrightで動作確認してください
│ > リアルタイムコラボレーションのマウス位置共有にユーザ名を表示したい
│ > リアルタイムコラボレーションの　TODO： 選択中の要素IDを渡す を解消したい
│ > ブラウザ２つ立ち上げてリアルタイムコラボレーションを試しましたが、四角などの図形描画が同期されません。playwrightで動作確認とコンソールの確認を行い、同期されるよう修正してください。修正方法は @/tmp/excalidraw/excalidraw-app と同じ方法となるようにしてください
│ > 修正を適用し、playwrightで動作確認とコンソールの確認を行い、スクリーンショットも確認してください
│ > ブラウザ２つ立ち上げてリアルタイムコラボレーションを試しましたが、四角などの図形描画が同期されません。playwrightで動作確認とコンソールの確認を行い、スクリーンショットも確認してください
```

- plan モード

```
│ > 改善が必要な部分の対応方法を調査、修正し、playwrightで動作確認とコンソールの確認を行い、スクリーンショットも確認してください
│ > @/tmp/excalidraw/excalidraw-app の方式も参考に計画してください
```

- URL 経由での参加

```
│ > URLリンクでのリアルタイムコラボレーション参加がされません。playwrightで動作確認とコンソールの確認を行い、スクリーンショットも確認してください
│ > @/tmp/excalidraw/excalidraw-app                                                                                                                     │
│   の方式も参考に改善が必要な部分の対応方法を調査、修正し、playwrightで動作確認とコンソールの確認を行い、スクリーンショットも確認してください
```
