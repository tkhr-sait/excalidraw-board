## 計画

```
excalidrawを利用した、リアルタイムコラボレーションをclaude codeを利用して実現するための作業計画とルールをCLAUDE.md、claude codeに渡す作業単位でdocs/develop/tasks/task-{00}-{taskname}.mdとして作成したい
- 段階的に考えて
- プロジェクト名は excalidraw-board
- フロントエンドは、excalidraw本体リポジトリの改造ではなく、新規で作成
- githubのexcalidraw公式リポジトリで採用されている方式を整理し、同一仕様となるようにする。ただし、firebaseは利用しない
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
- タスク実施時、前提を満たしていない場合は先に進まず相談する
- 問題発生時、問題を記録する
```

## 実施

- 01〜08までは以下プロンプトのみで実施

```
@docs/develop/tasks/task-01-project-analysis.md を実施後、検証項目を確認し、対応状況を更新してください
  〜
@docs/develop/tasks/task-08-integration-test.md を実施後、検証項目を確認し、対応状況を更新してください
```

- 08で動作確認したところ、ちゃんと動作していなかったので、以下プロンプト投入
  - レイアウトなど難あるが、一旦続行

```
ブラウザでアクセスしたところエラー。playwrightで動作確認、エラーログ確認し、解消してください

リアルタイムコラボレーション機能についてplaywrightで動作確認、エラーログ確認し、解消してください

@frontend/tests/ 下のテストが正常動作することを確認してください。エラー発生した場合、エラーログを調査し解消してください

解消できていない課題を docs/develop/problems 下に整理してください
```

- 09実施

```
@docs/develop/tasks/task-09-deployment-setup.md を実施後、検証項目を確認し、対応状況を更新してください
```
