# Template Setup Checklist

このテンプレートから新しい Pi 拡張OSSを作った後に埋めること。

## Repository

- [ ] GitHub repository name を決める
- [ ] GitHub About 欄を書く
- [ ] GitHub topics を設定する
  - [ ] `pi`
  - [ ] `pi-package`
  - [ ] `agent-skill`
  - [ ] `typescript`
- [ ] GitHub Settingsで `Template repository` をONにする
- [ ] Repository URL を `package.json` に反映する
- [ ] README の `OWNER/REPO` を実リポジトリに置き換える

## Package metadata

- [ ] `package.json` の `name` を変更する
- [ ] `description` を書く
- [ ] `author` を入れる
- [ ] `repository.url` を埋める
- [ ] `bugs.url` を埋める
- [ ] `homepage` を埋める
- [ ] `keywords` を見直す
- [ ] `LICENSE` の年・名前を更新する

## README placeholders

- [ ] `PACKAGE_DISPLAY_NAME` を置き換える
- [ ] `PACKAGE_NAME` を置き換える
- [ ] `OWNER/REPO` を置き換える
- [ ] one-line pitch を書く
- [ ] feature list を書く
- [ ] quick start command を実コマンドにする
- [ ] npm URL を確認する
- [ ] GitHub URL を確認する

## Pi package manifest

- [ ] `pi.extensions` に公開する拡張だけを残す
- [ ] `pi.skills` に公開する skill だけを残す
- [ ] 不要なら `prompts/` を消す
- [ ] 不要なら `themes/` を消す
- [ ] サンプル名を実名に変える

## TypeScript

- [ ] `extensions/index.ts` を実装に合わせて更新する
- [ ] `extensions/hello.ts` が不要なら削除する
- [ ] 共通ロジックを `lib/` に切り出す
- [ ] `strict: true` を維持する
- [ ] custom tool parameters は TypeBox schema で定義する
- [ ] string choices は `StringEnum` helper を使う
- [ ] runtime dependency は `dependencies`、Pi提供packageは `peerDependencies` に置く
- [ ] `package.json.files` に公開対象だけを入れる

## GitHub Template repo

- [ ] `gh repo create --template OWNER/pi-extension-template` で作成できることを確認する
- [ ] public/privateどちらの作成例もdocsに載せる

## CI / Release

- [ ] `npm run ci` が通る
- [ ] `npm pack --dry-run` が通る
- [ ] npm Trusted Publishing を設定する
- [ ] `NPM_TOKEN` を使っていないことを確認する
- [ ] tag publish が動くことを初回リリースで確認する

## npm page

- [ ] npm package URL を README に追加する
- [ ] npm description が適切に表示されるか確認する
- [ ] provenance が付いているか確認する
- [ ] 不要なファイルが package に含まれていないか確認する

## Before first release

- [ ] サンプルコードを実機 Pi でロードする
- [ ] `pi install git:github.com/OWNER/REPO` を試す
- [ ] `pi -e .` を試す
- [ ] README のコマンドがコピペで動くか確認する
- [ ] CHANGELOG に `0.1.0` を書く
