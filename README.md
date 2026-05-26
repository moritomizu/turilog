# TsuriLog

スマートフォンで釣果写真を投稿し、魚種・サイズ・釣った場所・釣った時刻・潮位情報を保存できる個人用の釣果ログWebアプリです。

MVPでは自分自身の釣果管理と潮位分析に集中しています。将来的には釣り大会モード、参加者別ランキング、投稿承認、天気・風・気圧連携、画像AI判定などを追加しやすいよう、Firebaseと型定義を分けた構成にしています。

## 主な機能

- Googleログイン
- メールアドレス + パスワード登録/ログイン
- 釣果写真のFirebase Storage保存
- 釣果データのCloud Firestore保存
- 釣った日時と緯度経度から潮位APIを呼び出し、潮位・上げ潮/下げ潮・何分目などを自動保存
- 新着順の釣果一覧
- 年間、魚種別、月別の最大サイズランキング
- Google Maps上の釣果マーカー表示
- 潮位傾向の表形式分析
- 明石海峡、鳴門海峡、友ヶ島水道などの海上保安庁潮流曲線ページへのリンク保存
- 釣った場所と日時に基づく当時の天候、風速、気温、降水量、雲量、旧暦、月齢の保存
- 気象庁の沿岸域海面水温情報に基づく当時の水温リンク/値の保存
- 過去投稿から魚種・コメント候補を表示するクイック投稿UI
- 任意のタックル情報と過去タックル候補の保存
- 現在地、釣りエリア選択、地図ピン、過去地点、緯度経度入力による場所指定
- 釣り大会の作成、参加、大会投稿、承認、ランキング表示

## 必要なサービス

- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Google Maps JavaScript API
- Stormglass Global Tide API または WorldTides API
- Open-Meteo Weather API
- 気象庁 沿岸域の海面水温情報

## Firebaseプロジェクトの作り方

1. [Firebase Console](https://console.firebase.google.com/) を開きます。
2. 「プロジェクトを追加」を押します。
3. プロジェクト名を入力します。
4. Google AnalyticsはMVPでは任意です。
5. 作成後、プロジェクト設定からWebアプリを追加します。
6. 表示されるFirebase SDK設定値を `.env.local` に入れます。

## Firebase Authenticationの設定方法

1. Firebase Consoleで「Authentication」を開きます。
2. 「始める」を押します。
3. 「Sign-in method」から「Google」を選びます。
4. 有効化し、サポートメールを選択して保存します。
5. 「Sign-in method」から「メール/パスワード」を選びます。
6. 「メール/パスワード」を有効化して保存します。
7. パスワードなしのメールリンクログインを使う場合は、同じ画面で「メールリンク（パスワードなしログイン）」も有効化します。
8. ローカル開発では `localhost` が承認済みドメインに入っていることを確認します。
9. 本番公開時は、Firebase Authenticationの承認済みドメインに `turilog.vercel.app` などの本番ドメインを追加します。

## Firestoreの有効化方法

1. Firebase Consoleで「Firestore Database」を開きます。
2. 「データベースの作成」を押します。
3. まずはテストモードで開始できます。
4. 本番公開時は必ずセキュリティルールを見直してください。

保存先コレクション:

- `users`
- `catches`

釣果一覧はFirestoreの複合インデックスがなくても動くように、ユーザー別に取得してアプリ側で新着順に並べ替えています。投稿数が増えてきたら、`firestore.indexes.json` の `userId ASC / caughtAt DESC` インデックスをFirebaseへ反映すると読み込み効率がよくなります。

Firestoreのインデックスエラーが表示された場合は、エラーメッセージ内のリンクを開いて作成してもOKです。

### 埋め込み公開を使う場合のFirestoreルール例

ブログやSNSに釣果カードを埋め込む場合、公開用の `publicCatches` コレクションだけをログインなしで読める必要があります。元の `catches` ではなく、緯度経度・ポイント名を抜いた埋め込み専用データを公開します。

まずはMVPとして、以下のような考え方でルールを設定します。

```txt
match /catches/{catchId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
}

match /publicCatches/{catchId} {
  allow read: if resource.data.isPublic == true;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
}
```

## Firebase Storageの有効化方法

1. Firebase Consoleで「Storage」を開きます。
2. 「始める」を押します。
3. まずはテストモードで開始できます。
4. 本番公開時はログインユーザーだけが自分の画像を保存できるルールに変更してください。

## Google Maps APIキーの取得方法

1. [Google Cloud Console](https://console.cloud.google.com/) を開きます。
2. Firebaseと同じ、または任意のプロジェクトを選びます。
3. 「APIとサービス」から「Maps JavaScript API」を有効化します。
4. 「認証情報」でAPIキーを作成します。
5. 本番ではHTTPリファラー制限を設定してください。

## 潮位APIキーの取得方法

Stormglassを使う場合:

1. [Stormglass](https://stormglass.io/) でアカウントを作成します。
2. APIキーを取得します。
3. `.env.local` に `TIDE_API_PROVIDER=stormglass` と `STORMGLASS_API_KEY` を設定します。

WorldTidesを使う場合:

1. [WorldTides](https://www.worldtides.info/) でAPIキーを取得します。
2. `.env.local` に `TIDE_API_PROVIDER=worldtides` と `WORLDTIDES_API_KEY` を設定します。

## .env.localの設定方法

`.env.local.example` をコピーして `.env.local` を作ります。

```bash
cp .env.local.example .env.local
```

中身を自分のキーに置き換えます。

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

TIDE_API_PROVIDER=stormglass
STORMGLASS_API_KEY=your_stormglass_api_key
WORLDTIDES_API_KEY=your_worldtides_api_key
```

FirebaseやAPIキーが未設定でも、画面上に不足している設定名が表示されます。

潮位APIキーは公開ブラウザへ出さないため、`NEXT_PUBLIC_` を付けないサーバー側環境変数として設定します。

## ローカルで起動する方法

依存関係をインストールします。

```bash
npm install
```

開発サーバーを起動します。

```bash
npm run dev
```

ブラウザで開きます。

```text
http://localhost:3000
```

## 潮の何分目の計算

干潮から満潮へ向かっている場合は上げ潮、満潮から干潮へ向かっている場合は下げ潮です。

前回の潮止まりから次回の潮止まりまでの時間を10等分し、釣った時刻がどの位置にあるかを `上げ3分` のように保存します。

## 海上保安庁の潮流曲線リンク

位置情報付きで投稿した場合、投稿地点に近い代表的な潮流推算地点を選び、海上保安庁 第五管区海上保安本部の潮流曲線ページへのリンクを保存します。

現在対応している地点:

```text
明石海峡（2号灯浮標付近）
明石海峡（3号灯浮標付近）
鳴門海峡
友ヶ島水道
```

選択ルール:

```text
神戸・本州側の明石周辺 → 明石海峡（2号灯浮標付近）
淡路島側の明石周辺 → 明石海峡（3号灯浮標付近）
和歌山・大阪湾南部周辺 → 友ヶ島水道
その他は代表地点の中から距離が近い地点
```

保存される項目:

```text
officialCurrentStationName
officialCurrentStationDistance
officialCurrentCurveUrl
officialCurrentSourceName
officialCurrentDate
officialCurrentNote
```

注意: 潮流曲線は推算地点のデータです。推算地点以外では実際の流れと異なる場合があります。航海目的ではなく、釣果記録の振り返り用途として利用してください。

## 当時の天候・風速・旧暦の保存

位置情報付きで投稿した場合、釣った日時と緯度経度をもとに [Open-Meteo](https://open-meteo.com/) から近い時刻の1時間ごとの天候データを取得して保存します。Open-MeteoはAPIキー不要で利用できます。

当時の天候、当時の風、当時の気温は投稿時点の現在値ではなく、`caughtAt` に入力した日時と投稿位置の緯度経度に最も近い1時間データを保存します。古い日付はOpen-Meteo Archive API、直近や未来日はForecast APIを参照します。実測観測所の値そのものではなく、Open-Meteoの気象モデル/再解析データとして扱ってください。

保存される主な項目:

```text
weather.weatherLabel
weather.weatherCode
weather.temperatureC
weather.precipitationMm
weather.cloudCoverPercent
weather.windSpeedMs
weather.windDirectionDeg
weather.windDirectionLabel
weather.windGustMs
weather.weatherSourceName
weather.weatherSourceUrl
weather.weatherFetchedAt
```

旧暦と月齢は外部APIを使わず、投稿日時からアプリ内で計算します。

```text
lunar.lunarDateLabel
lunar.lunarYearName
lunar.lunarMonthLabel
lunar.lunarDay
lunar.moonAge
lunar.moonPhase
lunar.moonPhaseLabel
```

位置情報がない投稿では、当時の天候・風速は未取得として保存されます。旧暦と月齢は日時だけで計算できるため保存されます。

## 当時の水温の保存

位置情報付きで投稿した場合、釣った地点に近い気象庁の沿岸域海面水温情報の海域を選び、当時日付に近い水温値と公式ページリンクを保存します。

保存される項目:

```text
seaTemperature.seaTemperatureC
seaTemperature.seaTemperatureAreaName
seaTemperature.seaTemperatureAreaCode
seaTemperature.seaTemperatureDate
seaTemperature.seaTemperatureSourceName
seaTemperature.seaTemperatureSourceUrl
seaTemperature.seaTemperatureFetchedAt
```

気象庁の公開テキストから値を取得できない場合でも、参照海域名と公式ページリンクは保存します。沿岸域の広域データなので、港内やピンポイントの表層水温とは差が出る場合があります。

## 釣り大会機能

複数ユーザーが大会に参加し、開催期間中の釣果でランキングを競えるMVP機能です。大会投稿は通常の個人釣果ログとしても保存されるため、釣果一覧、個人ランキング、分析にも反映されます。

### 大会作成方法

`/tournaments/new` から大会を作成します。

入力項目:

```text
大会名
説明
開始日時
終了日時
対象魚種
ランキング方式
ルール説明
公開/非公開
参加上限人数
```

ランキング方式:

```text
最大サイズ1匹勝負
合計サイズ
匹数勝負
```

公開設定:

```text
公開大会
- 誰でも参加できる公募大会です。
- /tournaments の大会一覧に表示されます。
- ランキングや大会釣果はログイン中の一般ユーザーも閲覧できます。

非公開大会
- 仲間だけで行うクローズド大会です。
- /tournaments の大会一覧には表示されません。
- 作成者が大会詳細URLを仲間に共有し、共有されたユーザーが参加します。
- ランキング、参加者、大会釣果は参加者と作成者のみ閲覧できます。
```

### 大会参加方法

公開大会は `/tournaments` から大会一覧を開き、大会詳細ページで参加名を入力して参加します。非公開大会は作成者から共有された大会詳細URLを開き、参加名を入力して参加します。参加時には任意でアイコン画像を設定できます。同じユーザーが同じ大会に重複参加しないよう、`tournamentParticipants` は `tournamentId_userId` の固定IDで保存します。

参加後は大会詳細ページから大会を抜けられます。大会を抜けると参加者一覧から外れますが、すでに投稿した個人釣果ログ自体は削除されません。

### 大会投稿方法

大会詳細ページの「大会釣果を投稿」から投稿すると、投稿画面に大会が自動選択されます。通常の投稿画面からも、参加中の大会を選択できます。

大会エントリー条件:

```text
caughtAt が大会期間内
位置情報あり
サイズが0より大きい
対象魚種に一致
```

条件を満たさない場合は大会エントリーせず、通常の個人ログとして保存します。

### 承認フロー

大会投稿は最初 `tournamentEntryStatus: pending` で保存されます。大会作成者、admin、subAdmin、または `canApproveEntries: true` の参加者は `/tournaments/[tournamentId]/admin` から承認または却下できます。

承認済みの投稿のみ、大会ランキングに反映されます。

### 大会権限と釣果ポイント保護

釣果ポイントはセンシティブな情報として扱います。大会参加者には `role` と権限フラグを保存し、正確な緯度経度は許可されたユーザーだけに表示します。

```text
owner
- 大会作成者
- 権限変更、承認/却下、詳細位置マップを利用できます。

admin
- ownerに近い管理権限です。
- 参加者管理、承認/却下、詳細位置マップを利用できます。

subAdmin
- 補助管理者です。
- 承認/却下、詳細位置マップ、詳細釣果情報を利用できます。

participant
- 一般参加者です。
- ランキングと公開釣果一覧を閲覧できます。
- 他人の正確な緯度経度は表示されません。

viewer
- 閲覧専用です。
- ランキングと公開情報のみ閲覧でき、投稿はできません。
```

大会詳細ページには、権限があるユーザーだけ「釣果ポイントマップ」が表示されます。一般参加者には以下の文言を表示します。

```text
釣果ポイントマップは、主催者または許可されたユーザーのみ閲覧できます。
```

参加者権限は `/tournaments/[tournamentId]/members` で owner/admin が変更できます。owner の role は変更できません。

### 大会削除

大会作成者のみ、大会編集ページの最下部から大会を削除できます。削除すると大会データ、参加者データ、大会ランキングは削除されます。大会に紐づいていた釣果は削除せず、通常の個人釣果ログとして残します。

### Firestore構造

```text
tournaments
- ownerId
- name
- description
- startAt
- endAt
- targetFishTypes
- rankingType
- rules
- visibility
- maxParticipants
- createdAt
- updatedAt

tournamentParticipants
- tournamentId
- userId
- userName
- email
- avatarUrl
- role
- canViewExactLocation
- canViewPrivateCatchDetails
- canApproveEntries
- joinedAt
- updatedAt
- status

catches 追加項目
- latitude
- longitude
- publicLatitude
- publicLongitude
- locationVisibility
- tournamentId
- isTournamentEntry
- tournamentEntryStatus
- tournamentSubmittedAt
```

### Firestore Security Rules方針

現状のMVPではアプリ側で表示制御を行っています。本番で大会機能を広く使う場合は、Firestore Security Rulesでも以下を守る設計にしてください。

```text
- 非公開大会は参加者のみ read 可能にする
- tournamentParticipants の権限変更は owner/admin のみにする
- owner の role はクライアントから変更不可にする
- catches の正確な latitude / longitude は権限者だけが読める構造に分離する
- 一般参加者向けには publicLatitude / publicLongitude または位置情報なしの公開データを返す
```

Firestoreはフィールド単位の秘匿が難しいため、正確位置を完全に保護する場合は `tournamentPrivateCatchLocations` のような別コレクションへ分離する設計が安全です。

### 将来的な拡張予定

```text
EXIF撮影日時チェック
EXIF GPSチェック
画像重複チェック
大会エリア外判定
AI魚種判定
メジャー画像確認
投稿の詳細審査
参加者招待
非公開大会の招待コード
賞品/スポンサー表示
```

## クイック投稿UI

釣り中でも短時間で投稿できるように、投稿画面は以下の操作を優先しています。

## グループ機能

グループ機能は、日常的な釣り仲間コミュニティとして釣果を共有するための機能です。大会が期間限定イベントであるのに対し、グループは継続的に釣果一覧、ランキング、マップ、分析を共有します。

### グループ作成方法

`/groups/new` からグループを作成します。作成者は自動的に `owner` として `groupMembers` に登録されます。

入力項目:

```text
グループ名
説明
公開範囲 private / inviteOnly / public
位置情報表示設定
```

### 招待コード参加

グループ作成時に `inviteCode` が発行されます。グループ詳細ページの「仲間を招待」から招待リンクをコピーできます。

招待されたユーザーは `/groups/invite/[inviteCode]` を開くと、ログイン前でもグループ名、説明、参加メリットを確認できます。ログイン済みの場合はそのまま参加でき、未ログインの場合はGoogleログイン後に招待ページへ戻って参加できます。

招待コードを直接入力する場合は `/groups/join` を使います。

### グループ釣果投稿

`/groups/[groupId]/post` からグループに紐づく釣果を投稿できます。投稿された釣果は通常の個人ログとしても残り、`groupIds` と `primaryGroupId` によってグループにも紐づきます。

### 代理投稿

owner / admin / moderator / `canProxyPost` が true のメンバーは、釣った人を選択して代理投稿できます。

```text
postedByUserId: 投稿したユーザー
actualAnglerUserId: 実際に釣ったユーザー
isProxyPost: 代理投稿かどうか
```

### グループ分析

`/groups/[groupId]/analysis` で以下を表形式で確認できます。

```text
今日の釣果数
今月の釣果数
今月最大サイズ
最多魚種
最多エリア
日別/月別/エリア別分析
```

### グループ権限設計

```text
owner
- 全権限を持ちます。

admin
- ownerに近い管理権限を持ちます。

moderator
- 代理投稿や釣果編集を行える補助管理者です。

member
- 通常メンバーです。自分の釣果投稿と自分の投稿編集ができます。

viewer
- 閲覧専用です。
```

### 位置情報表示制御

グループごとに位置情報表示設定を持ちます。

```text
exactForAdminsOnly: 正確位置は管理者のみ
exactForAllMembers: 全メンバーに正確位置
blurredForMembers: メンバーにはぼかし位置
hidden: 位置情報非表示
```

MVPでは、正確位置を見られないユーザーには `publicLatitude/publicLongitude` がある場合のみマップ表示し、それ以外はマップに表示しません。

### Firestore構造

```text
groups
- ownerId
- name
- description
- visibility
- locationVisibilityDefault
- inviteCode
- createdAt
- updatedAt
- memberCount
- catchCount

groupMembers
- groupId
- userId
- userName
- email
- role
- canViewExactLocation
- canPost
- canProxyPost
- canEditGroupCatches
- canDeleteGroupCatches
- joinedAt
- updatedAt
- status

catches 追加項目
- groupIds
- primaryGroupId
- postedByUserId
- actualAnglerUserId
- isProxyPost
- proxyPostReason
```

### 今後の拡張予定

```text
招待URL
メンバー削除
釣果編集専用画面
位置ぼかし自動生成
グループ内コメント
グループ内通知
グラフ分析
```

- 写真、魚種、サイズ、投稿ボタンを中心に配置
- 魚種は過去投稿から頻出順に候補を表示
- コメントも過去入力から候補を表示
- サイズは `-5`、`-1`、`+1`、`+5` ボタンで微調整
- 釣った日時は初期値を現在時刻に設定
- 「時刻を今にする」ボタンで即更新
- 「現在地を取得」ボタンで潮位、当時の天候、潮流曲線リンクに必要な位置を保存
- コメントや日時変更は詳細入力に折りたたみ
- 写真はカメラ撮影と写真ライブラリ選択の両方に対応
- タックル情報は任意入力で、過去投稿から候補を表示
- 過去釣果を登録するときは、釣りエリア選択、地図ピン、過去地点候補、緯度経度入力で場所を指定可能

タックル情報として保存される項目:

```text
tackle.lureName
tackle.lureColor
tackle.rodName
tackle.reelName
tackle.lineName
tackle.leaderName
```

釣りエリア選択は、つりそくの「釣り場こだわり検索」に掲載されているエリア名を参考にしたアプリ内マスタを使います。選んだエリアの代表地点を入れたあと、「地図でピン指定」で細かい場所を微調整できます。

地図ピン指定はGoogle Maps JavaScript APIを使います。地図ピン指定は「地図でピン指定」を開いた時だけ地図を読み込みます。

Google Mapsは表示回数やAPI利用量に応じた従量課金です。個人利用の少量テストなら大きな負担になりにくいですが、ユーザー数が増えると地図表示やGeocoderの利用回数に応じて費用が増える可能性があります。本格的にスケールする場合は、地図を必要時だけ開く、過去地点候補を優先する、MapLibre/OpenStreetMap系の構成を検討する、などの対策を検討してください。

## デプロイ候補

- Vercel
- Firebase Hosting
- Google Cloud Run

まずはNext.jsとの相性がよいVercelが簡単です。デプロイ先にも `.env.local` と同じ環境変数を設定してください。

## Vercelで公開する方法

スマホから釣り場で投稿するには、ローカルの `http://localhost:3000` ではなく、HTTPSで公開されたURLが必要です。まずはVercelへのデプロイがおすすめです。

### 1. GitHubにアップロードする

このプロジェクトをGitHubのリポジトリに push します。

まだGit管理していない場合の例:

```bash
git init
git add .
git commit -m "Initial fishing log MVP"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/リポジトリ名.git
git push -u origin main
```

### 2. Vercelにインポートする

1. [Vercel](https://vercel.com/) にログインします。
2. `Add New...` → `Project` を選びます。
3. GitHubリポジトリを選びます。
4. Framework Preset が `Next.js` になっていることを確認します。
5. 環境変数を登録します。

### 3. Vercelに設定する環境変数

Vercelの `Project Settings` → `Environment Variables` に以下を登録します。

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
TIDE_API_PROVIDER
STORMGLASS_API_KEY
WORLDTIDES_API_KEY
```

`NEXT_PUBLIC_` が付くものはブラウザで使う値、付かない `STORMGLASS_API_KEY` などはサーバー側だけで使う秘密の値です。

### 4. デプロイする

環境変数を入れたら `Deploy` を押します。成功すると以下のようなURLが発行されます。

```text
https://your-app-name.vercel.app
```

### 5. Firebase Authenticationにドメインを追加する

Firebase Consoleで以下に進みます。

```text
Authentication
→ 設定
→ 承認済みドメイン
```

Vercelのドメインを追加します。

```text
your-app-name.vercel.app
```

### 6. Google Maps APIキーにVercel URLを追加する

Google Cloud ConsoleのAPIキー制限で、HTTPリファラーに以下を追加します。

```text
https://your-app-name.vercel.app/*
```

ローカル確認用の以下も残しておくと便利です。

```text
http://localhost:3000/*
```

### 7. スマホで確認する

スマホでVercelのURLを開き、Googleログイン、位置情報許可、写真投稿を確認します。位置情報を使うため、公開URLはHTTPSである必要があります。VercelのURLは自動でHTTPSになります。

## ポイントぼかし機能

釣果投稿では、投稿スピードを落とさないため、投稿ごとに位置情報の公開範囲を選ばせません。位置情報が取得できた場合は、保存時に以下を自動で記録します。

- 正確位置: `latitude` / `longitude`
- ぼかし位置: `publicLatitude` / `publicLongitude`
- エリア情報: `areaName` / `areaCode`
- ぼかし半径: `blurRadiusMeters`

初期のぼかし半径は1000mです。ぼかし位置は投稿時に一度だけ生成して保存するため、画面を開くたびに位置が変わることはありません。

### なぜ投稿時に公開範囲を選ばせないか

釣行中や釣行直後の投稿では、入力項目が増えるほど投稿が面倒になります。このアプリでは「爆速投稿」と「漁場保護」を両立するため、投稿時は必要な位置データを安全に保存し、表示時にグループ・大会・権限に応じて自動で出し分けます。

### 表示の違い

- 本人: 正確位置を表示
- グループ管理者: グループ設定に応じて正確位置を表示
- 大会主催者: 大会設定に応じて正確位置を表示
- 一般メンバー: ぼかし位置またはエリア名を表示
- 未許可ユーザー: 位置情報を非表示

### グループでの位置表示設定

グループ作成・編集画面の「グループ内の位置情報表示」で設定できます。

- 管理者のみ正確位置を表示
- メンバー全員に正確位置を表示
- メンバーにはぼかして表示
- メンバーには表示しない

### 大会での位置表示設定

大会作成・編集画面の「大会内の位置情報表示」で設定できます。

- 主催者のみ正確位置を表示
- 参加者にはぼかして表示
- 参加者にはエリア名のみ表示
- 参加者には表示しない

### 将来的な改善予定

- 海上判定
- 水域メッシュによるエリア判定
- 投稿者ごとのデフォルト設定
- エリア別ぼかし半径
- 大会ごとの詳細な位置情報ルール

## オンボーディング・プロフィール機能

初回ログイン後、`users.onboardingCompleted` が `true` ではないユーザーは `/onboarding` に案内されます。

オンボーディングでは、釣果投稿や分析を便利にするために以下を登録できます。

- 表示名
- 年代
- 居住エリア
- よく行く釣行エリア
- 主な釣りジャンル
- 釣行頻度
- 主な釣行スタイル
- アプリでやりたいこと
- 釣りへの熱量
- 初期タックル1セット

入力はあとから `/profile` で編集できます。初回登録時の離脱を防ぐため、オンボーディングには「あとで設定する」ボタンがあります。スキップした場合は `users.onboardingSkippedAt` を保存し、毎回強制表示しない設計です。

保存先:

```text
users/{uid}
```

主な追加フィールド:

```text
onboardingCompleted
onboardingCompletedAt
onboardingSkippedAt
ageRange
residenceArea
fishingAreas
fishingGenres
fishingFrequency
fishingStyle
appPurposes
fishingMotivation
updatedAt
```

## タックル管理機能

`/profile/tackles` で、よく使うタックルセットを登録・編集・削除できます。

保存先:

```text
tackles/{tackleId}
```

保存項目:

```text
userId
name
fishingGenre
rod
reel
line
leader
lure
memo
isDefault
createdAt
updatedAt
```

釣果投稿画面では、登録済みタックルを選択できます。選択するとロッド・リール・ライン・リーダー・ルアーが投稿フォームへ反映されます。

投稿時には以下を `catches` にスナップショット保存します。

```text
tackleId
tackleName
rod
reel
line
leader
lure
```

これにより、あとからタックル管理側の内容を変更しても、過去釣果に記録された当時のタックル情報は変わりません。

## 将来的な分析活用

オンボーディングで固定選択肢として保存した情報は、将来的に以下の分析へ活用できます。

- 年代別利用傾向
- エリア別利用傾向
- 釣種別利用傾向
- 釣行頻度別の継続率
- 熱量別の課金可能性
- タックル別釣果傾向
- スポンサー提案用のセグメント分析

プロフィール情報やタックル情報は個人の趣味嗜好に関わるデータです。公開範囲や分析利用を広げる場合は、利用規約・プライバシーポリシー・画面上の説明をあわせて見直してください。

## Feature Flags / プラン管理

課金導入前の準備として、機能ごとの利用可否を判定する基盤を追加しています。

主なファイル:

```text
src/lib/plans.ts
src/lib/features.ts
src/lib/featureEvents.ts
src/components/FeatureLock.tsx
```

`src/lib/plans.ts` で、以下の仮プランと利用可能機能を定義しています。

```text
free
premium
organizer
groupPro
tester
```

`tester` は検証用で、原則すべての機能を使えるプランです。

## hasFeature の使い方

画面側で有料候補機能を制御する場合は、直接 `subscriptionPlan` を見ずに `hasFeature` または `FeatureGate` を使います。

例:

```tsx
<FeatureGate userId={user.uid} featureKey="advancedAnalysis">
  <Analysis userId={user.uid} />
</FeatureGate>
```

個別に判定したい場合:

```ts
const allowed = await hasFeature(userId, "detailedMap");
```

Firestore の `users` には、将来的なプラン変更や個別開放に備えて以下を保存できます。

```text
subscriptionPlan
enabledFeatures
disabledFeatures
trialEndsAt
planUpdatedAt
```

`enabledFeatures` は個別に機能を開放したい場合、`disabledFeatures` は一時的に制限したい場合に使います。

## FeatureLock の使い方

まだ使えない機能には `FeatureLock` を表示します。

```tsx
<FeatureLock userId={userId} featureKey="csvExport" />
```

表示内容:

- 機能名
- できること
- 想定プラン
- 興味ありボタン
- 詳しく知りたいボタン

決済は行いません。ボタン操作は `featureEvents` に保存されます。

## featureEvents の保存内容

ユーザーが有料候補機能に反応した場合、Firestore の `featureEvents` コレクションに保存します。

保存項目:

```text
userId
featureKey
eventType
planAtEvent
pagePath
createdAt
metadata
```

`eventType` は以下を想定しています。

```text
viewLockedFeature
clickInterested
clickLearnMore
attemptUseFeature
useFeature
```

簡易確認画面:

```text
/admin/feature-events
```

管理者判定は、`users.subscriptionPlan === "tester"` または `.env.local` の `NEXT_PUBLIC_ADMIN_UIDS` に含まれるUIDで行います。

## プラン一覧ページ

以下のページで、準備中のプランと機能一覧を確認できます。

```text
/plans
```

「興味あり」を押すと、以下の `featureKey` で `featureEvents` に保存されます。

```text
plan_premium
plan_organizer
plan_groupPro
```

## Stripe連携の想定

将来的にStripe決済を導入する場合は、決済完了後に `users.subscriptionPlan` と `planUpdatedAt` を更新します。

例:

```text
subscriptionPlan: "premium"
planUpdatedAt: serverTimestamp()
```

その後、画面側は既存の `hasFeature` 判定のまま利用できます。

## 今後の拡張候補

- 釣り大会モード
- 参加者別ランキング
- 大会期間設定
- 投稿承認機能
- EXIFから撮影日時・GPS取得
- 魚種別詳細分析
- 潮回り表示
- 大潮・中潮・小潮の分類
- 天気情報連携
- 気圧情報連携
- 風速情報連携
- 画像AIによる魚種判定
- メジャー画像からサイズ推定
- LINE通知
- 多言語対応
