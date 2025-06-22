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
