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
