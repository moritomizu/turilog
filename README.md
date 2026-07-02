# TSURILOGUE

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
3. ロケーションを選択して有効化します。
4. 本番公開前には、テストモードのままにせず `storage.rules` をデプロイしてください。

### Cloud Storage Security Rules 方針

このアプリでは、Firebase Storage に釣果写真、サイズ確認用写真、プロフィール画像、グループ画像、大会画像などを保存します。

本番公開前提のルールは `storage.rules` で管理しています。`firebase.json` では以下のように Storage Rules を参照しています。

```json
{
  "storage": {
    "rules": "storage.rules"
  }
}
```

主な保存パスとルール方針:

| パス | 用途 | 読み取り | 書き込み |
| --- | --- | --- | --- |
| `/catches/{userId}/{fileName}` | 釣果写真 | ログインユーザー | 本人のみ |
| `/measurementPhotos/{userId}/{fileName}` | サイズ確認用写真 | 本人のみ | 本人のみ |
| `/avatars/{userId}/{fileName}` | プロフィール画像 | 全員 | 本人のみ |
| `/groups/{ownerId}/icons/{fileName}` | グループアイコン | 全員 | 所有者のみ |
| `/tournaments/{ownerId}/covers/{fileName}` | 大会カバー画像 | 全員 | 所有者のみ |
| `/tournamentParticipants/{userId}/{fileName}` | 大会参加者アイコン | ログインユーザー | 本人のみ |
| `/public/{fileName}` | 公開素材 | 全員 | クライアント書き込み禁止 |

共通ルール:

- 未ログインユーザーの書き込みは禁止
- アップロードできるのは画像ファイルのみ
- 画像サイズは10MB未満
- 想定外のStorageパスはすべて拒否

既存のプロフィール画像パス `/users/{userId}/avatars/{fileName}` は、過去に保存した画像が表示できなくならないよう互換パスとして読み取りを許可しています。

Storage Rules を反映するコマンド:

```bash
firebase deploy --only storage
```

注意: サイズ確認用写真はMVPでは本人のみ閲覧できます。大会主催者や管理者がサイズ確認用写真を閲覧する権限は、今後 Storage パス設計またはサーバー経由の署名URL発行で拡張する想定です。

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

Firestore の `users` には、プラン変更や個別開放に備えて以下を保存できます。

```text
subscriptionPlan
subscriptionStatus
stripeCustomerId
stripeSubscriptionId
currentPeriodEnd
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

Premium は Stripe Checkout で月額登録できます。Organizer / Group Pro は料金目安の表示を `featureEvents` に保存し、ニーズ調査として扱います。

料金目安を表示すると、以下の `featureKey` で `featureEvents` に保存されます。

```text
plan_premium
plan_organizer
plan_groupPro
```

## Stripe Premium課金MVP

Premiumプランのみ、Stripe Checkoutによる月額サブスクリプション登録に対応しています。

Premium:

```text
月額980円
```

Premiumで有効になる主な機能:

```text
aiReport
advancedAnalysis
tackleAnalysis
detailedMap
catchVerificationDetails
```

Stripe連携で使う主なファイル:

```text
src/app/api/stripe/create-checkout-session/route.ts
src/app/api/stripe/create-portal-session/route.ts
src/app/api/stripe/webhook/route.ts
src/lib/server/firebaseRest.ts
```

### Stripe設定手順

1. Stripe Dashboardで商品を作成します。
2. 月額980円の継続課金価格を作成します。
3. 作成された Price ID を控えます。
4. Developers > API keys から Secret key を控えます。
5. Developers > Webhooks でエンドポイントを追加します。

Webhook URL:

```text
https://your-domain.vercel.app/api/stripe/webhook
```

受け取るイベント:

```text
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
```

6. Webhook signing secret を控えます。
7. `.env.local` と Vercel の環境変数に以下を設定します。

```text
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...
NEXT_PUBLIC_APP_URL=https://tsurilogue.com
```

Checkout Session 作成時は、`NEXT_PUBLIC_APP_URL` を基準に `success_url` / `cancel_url` を生成します。本番環境では Vercel の Production Environment Variables に `NEXT_PUBLIC_APP_URL=https://tsurilogue.com` を設定してください。

Stripeのテストモードで確認する場合は、以下をすべてテスト用でそろえてください。

- `STRIPE_SECRET_KEY`: `sk_test_...`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: `pk_test_...`
- `STRIPE_PREMIUM_PRICE_ID`: テスト環境で作成した `price_...`
- `STRIPE_WEBHOOK_SECRET`: テスト用Webhook endpointの `whsec_...`

本番モードで確認する場合は、`sk_live_...` / `pk_live_...` と本番環境で作成したPrice IDを使います。テストキーと本番Price IDを混在させると、Checkout画面を開けません。

Checkout画面が開かない場合は、Vercel Logsで `create checkout session failed` または `stripe checkout sessions API error` を確認してください。環境変数不足、Price IDの間違い、StripeキーとPriceのモード混在、Firebaseログイン確認失敗などが表示されます。

決済完了後のPremium反映はStripe Webhookで行います。加えて、Checkout完了後に `/api/stripe/sync-subscription` でSubscription状態を再確認する保険処理を入れています。Webhookが遅延・失敗した場合でも、ログイン中ユーザーがプラン画面へ戻ったタイミング、または再度Premiumボタンを押したタイミングで、Stripe側に有効なSubscriptionがあれば `users/{uid}` をPremiumへ同期します。

WebhookではFirestoreの `users` に以下を保存します。

```text
subscriptionPlan
subscriptionStatus
stripeCustomerId
stripeSubscriptionId
currentPeriodEnd
planUpdatedAt
```

`subscriptionPlan: "premium"` になると、既存の `hasFeature` 判定でPremium機能が有効になります。解約イベントを受け取ると `subscriptionPlan: "free"` に戻します。

### 解約・カード変更

`/plans` の「契約・カードを管理する」から Stripe Customer Portal を開きます。

Customer Portalを使うには、Stripe Dashboard の Billing > Customer portal でポータル設定を有効化してください。

ローカルでStripe Webhookを確認する場合は、Stripe CLIの利用が便利です。Webhook secretはローカル用と本番用で別になるため、環境ごとに設定してください。

## AI釣果レポートβ

`/ai-report` では、自分の釣果データをもとに、魚種・サイズ・釣行日時・潮位・エリア・タックル傾向を集計し、次回釣行のヒントになるAIレポートを生成できます。

AIが生データから勝手に断定するのではなく、まずアプリ側で釣果数、最大サイズ、時間帯、潮位、エリア、タックルを集計し、その要約をOpenAI APIへ渡して文章化します。釣果数が少ない場合は「参考傾向」「仮説」として表示します。

Group Pro または Tester のユーザーは、参加中グループの釣果を母数にしたAIレポートも生成できます。母数が増えることで傾向は見つけやすくなりますが、メンバーごとの釣り方、腕前、狙い方の違いも混ざるため、レポートでは「グループ全体の参考傾向」として扱います。

生成したレポートは画面からコピーできます。PDF保存したい場合は、レポートカードの「PDF保存」からブラウザの印刷画面を開き、スマホやPCの「PDFとして保存」を利用します。

次回釣行予定日には時間帯も指定できます。予定日と予定エリアがある場合、代表地点をもとに予定時間帯の潮位、天候、気温、風、降水、月齢、潮回り目安もAIに渡します。

AIレポートでは、入力した予定時間帯そのものを変更する提案はしません。たとえば「夜釣り予定」を入れた場合は、朝や夕方への変更をすすめるのではなく、夜の予定時間帯内で潮位、上げ/下げ、何分目、風、天候をどう見るかを提案します。

エリア傾向は、釣果に `pointName` が保存されている場合はポイント名を優先して扱います。ポイント名がない釣果は従来どおりエリア名で集計します。

分析期間は以下から選択できます。

```text
全期間
直近7日
直近30日
直近90日
直近180日
今年
同じ季節
```

「同じ季節」は現在月の前後1か月を対象にする簡易判定です。潮回りは月齢からの目安であり、地域ごとの厳密な潮汐表分類ではありません。

### OpenAI APIキー設定

`.env.local` に以下を追加してください。

```text
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
```

Vercelに公開している場合は、Vercelの Project Settings → Environment Variables にも同じ値を追加してください。`OPENAI_API_KEY` はサーバー側だけで使うため、`NEXT_PUBLIC_` は付けません。

### aiReports コレクション

生成したレポートは Firestore の `aiReports` コレクションに保存されます。

保存項目:

```text
userId
fishType
period
sourceScope
groupId
groupName
plannedDate
plannedTimeBand
plannedStartTime
plannedEndTime
plannedArea
catchCount
reportText
summaryJson
createdAt
```

Firestore Security Rules では、最低限以下の考え方で設定してください。

```text
aiReports は request.auth.uid == resource.data.userId のユーザーだけが読める
aiReports の作成は request.auth.uid == request.resource.data.userId の場合だけ許可する
```

### データ不足時の扱い

- 0件: 分析に必要な釣果データがまだないことを案内します。
- 1〜4件: 参考メモとして表示します。
- 5〜19件: 仮説段階として表示します。
- 20件以上: 一定の傾向分析として表示します。

AIレポートは釣果を保証するものではありません。天候、水温、ベイト、人的要因などで結果は変わるため、次回釣行の参考情報として使ってください。

### 将来的な拡張予定

- 天気予報連携
- 風速/気圧連携
- 水温連携
- AI釣行計画
- グループAIレポート
- 大会AIレポート

## 釣果デジタル証明β

釣果デジタル証明βは、釣果投稿を「後から検証・再評価・再スコアリングできる証拠データ」として保存するための基盤です。

投稿時に `catches` ドキュメントへ以下を保存します。

```text
catchProof
verificationScore
rankingEligibility
```

### catchProof の構造

`catchProof` は、釣果の証明に使う情報をまとめたパッケージです。

主な内容:

```text
proofVersion: "v1"
image: 写真、EXIF有無、EXIF撮影日時有無
size: 魚種、サイズ、計測方法、サイズ確認用写真
time: 釣った日時、投稿日時、時間差
location: GPS、ぼかし位置、エリア、ポイント名、精度
environment: 潮位、天候、水温、月齢
context: 大会、グループ、代理投稿、対象魚種
flags: 確認事項
anomalyFindings: 異常検知結果
generatedAt
```

`proofVersion` は初期値 `"v1"` です。将来スコアリング仕様を変える場合も、保存済み証明情報を再評価できるようにします。

### verificationScore の計算方法

`verificationScore` は以下のカテゴリで最大100点です。

```text
mediaScore: 最大15点
gpsScore: 最大20点
timeScore: 最大15点
tideScore: 最大15点
fishScore: 最大10点
measurementScore: 最大10点
tournamentScore: 最大15点
```

重大flagがある場合は `needs_review` になります。

重大flag:

```text
missing_photo
missing_gps
tournament_out_of_period
tournament_target_fish_mismatch
```

### rankingEligibility の仕様

ランキング反映可否は以下をもとに判定します。

```text
verificationScore.total >= 60
重大flagなし
大会期間外ではない
対象魚種不一致ではない
```

満たす場合は `eligible: true`、満たさない場合は `eligible: false` と `reason` を保存します。

### 異常検知エンジン Phase 5

AI画像認識を使わず、既存データで判定できるルールベースの異常検知を追加しています。

検知結果は `catchProof.anomalyFindings` と `verificationScore.anomalyFindings` に保存され、該当するものは `verificationScore.flags` / `messages` にも反映されます。

現在の検知項目:

```text
duplicate_image_suspected: 同じユーザーによる同一画像URL投稿の疑い
impossible_travel_suspected: 2時間以内に50km以上離れた釣果投稿の疑い
abnormal_size_suspected: 魚種別上限を超えるサイズ、または0cm以下のサイズ
tournament_area_mismatch: 大会に allowedAreaCodes / allowedAreas がある場合の対象エリア外疑い
posted_at_far_from_caught_at: 釣った日時と投稿日時の差が24時間以上
```

初期閾値:

```text
短時間移動: 2時間以内 / 50km以上
投稿時刻乖離: 24時間以上
```

魚種別サイズ上限は `src/lib/fishSizeRules.ts` で管理しています。代表例は以下です。

```text
真鯛: 100cm
ブリ: 120cm
サワラ: 120cm
シーバス: 110cm
アジ: 60cm
カワハギ: 45cm
アオリイカ: 50cm
タチウオ: 150cm
```

同一画像検知は、将来的な perceptual hash 実装を見据えつつ、MVPでは `imageHash` があれば優先し、未実装の場合は `imageUrl` / `photoUrl` の一致で簡易判定します。

異常検知は「不正確定」ではなく、大会運営者が確認しやすくするための補助情報です。

### サイズ確認用写真

釣果投稿フォームには「サイズ確認用写真（任意）」があります。

メジャーと魚が一緒に写った写真を登録すると、以下のように保存されます。

```text
measurementPhotoUrl
measurementMethod: "measurePhoto"
```

登録しない場合は以下です。

```text
measurementMethod: "manual"
```

`measurementMethod` の意味:

```text
manual: サイズを手入力した状態
measurePhoto: サイズ確認用写真がある状態
aiAssisted: 将来的にAIサイズ計測を使った状態
```

`measurementScore` は以下で最大10点です。

```text
sizeCm あり: +4
measurementMethod が measurePhoto: +4
measurementPhotoUrl あり: +2
```

大会投稿で `measurementPhotoUrl` がない場合は `measurement_photo_missing` flag が付きます。

大会承認画面では、通常の釣果写真に加えて、サイズ確認用写真の有無、`measurementMethod`、`measurementScore`、`measurement_photo_missing` flag を確認できます。

釣果編集画面からもサイズ確認用写真を追加・変更・削除できます。変更時は `catchProof` / `verificationScore` / `rankingEligibility` を再計算します。

Feature Flags では `catchVerification` を定義しています。Tester はすべての機能を利用でき、Organizer には大会運営向けに `catchVerification` を含めています。ただし、通常投稿の保存処理は Feature Flag に関係なく壊れないよう、証明情報は保存されます。

### 既存釣果への後付け生成

管理者は以下のページから、既存釣果の証明情報を後付け生成・再計算できます。

```text
/admin/generate-catch-proof
```

機能:

- catchProof 未生成一覧
- 個別再生成
- 未生成を一括生成
- 全件を一括再計算
- 管理者向け詳細JSON表示

### 今後の拡張予定

- EXIF撮影日時の自動抽出
- EXIF GPSの自動抽出
- GPS精度の保存
- メジャー画像AI解析
- 画像重複検知
- 大会エリア判定
- 承認履歴の保存
- スコアリング仕様のバージョン管理

## ライトPWA対応

TSURILOGUE はスマートフォンのホーム画面に追加して、アプリのように起動できるライトPWAに対応しています。

今回の対応範囲:

- `manifest.json` によるアプリ名・表示モード設定
- ホーム画面用アイコン設定
- `display: standalone`
- `theme_color` / `background_color`
- iOS向け `apple-touch-icon` / mobile web app capable 設定

注意:

- 今回はライトPWA化のみです。
- オフライン完全対応、プッシュ通知、バックグラウンド同期はまだ実装していません。
- 通信が不安定な場合の投稿下書き保持は、投稿画面側の端末内保存機能で補助しています。

### iPhoneでホーム画面に追加する方法

1. Safariで公開URLを開きます。
2. 共有ボタンをタップします。
3. 「ホーム画面に追加」を選びます。
4. 名前が `TSURILOGUE` になっていることを確認して追加します。

### Androidでホーム画面に追加する方法

1. Chromeで公開URLを開きます。
2. メニューを開きます。
3. 「ホーム画面に追加」または「アプリをインストール」を選びます。
4. 追加後、ホーム画面のアイコンから起動できます。

### 確認方法

ローカルまたは公開URLで以下を確認します。

```text
/manifest.json
```

ブラウザの開発者ツールでは、Application タブから Manifest の内容を確認できます。

## PWA通知機能 MVP

TSURILOGUE は Firebase Cloud Messaging を使った Web Push 通知の土台を用意しています。

通知対象の例:

- 大会投稿が承認された時
- グループに新しい釣果が投稿された時
- AI釣果レポートが生成された時
- 将来的な大会開始、終了間近、ランキング更新、運営お知らせ

通知設定ページ:

```text
/settings/notifications
```

このページでできること:

- 通知許可の取得
- FCM token の保存
- 通知カテゴリのON/OFF
- テスト通知の送信

運営者向けのお知らせ配信ページ:

```text
/admin/notifications
```

このページでは、管理者が「運営からのお知らせ」を通知ONのユーザーへ一斉配信できます。

配信対象:

- `notificationEnabled: true`
- `notificationPreferences.systemNotice` が `false` ではない
- `fcmTokens` が保存されているユーザー

利用には `ADMIN_UIDS` または `NEXT_PUBLIC_ADMIN_UIDS` に管理者UIDを設定しておく必要があります。

### Firebase Cloud Messaging の設定

Firebase Console で対象プロジェクトを開き、Cloud Messaging の設定から Web Push 証明書を作成します。

取得した VAPID key を `.env.local` と Vercel の環境変数に設定します。

```text
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_firebase_web_push_vapid_key
```

Googleログインを安定させるため、`NEXT_PUBLIC_FIREBASE_API_KEY` はFirebase Webアプリの元のAPIキーのままにします。FCM token 登録だけ別APIキーで切り分けたい場合は、以下を追加できます。

```text
NEXT_PUBLIC_FIREBASE_MESSAGING_API_KEY=your_firebase_messaging_api_key
```

このキーには、少なくとも以下のAPIを許可します。

```text
Firebase Installations API
FCM Registration API
Firebase Cloud Messaging API
```

`NEXT_PUBLIC_FIREBASE_MESSAGING_API_KEY` を設定しない場合は、従来どおり `NEXT_PUBLIC_FIREBASE_API_KEY` を使ってFCM tokenを取得します。

通知送信用 API では Firebase サービスアカウントを使います。

```text
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key\n-----END PRIVATE KEY-----\n"
ADMIN_UIDS=operator_uid_1,operator_uid_2
```

`FIREBASE_PRIVATE_KEY` は改行を `\n` として1行で設定してください。Vercelでも同じ形式で設定します。

### 保存される users フィールド

```text
notificationEnabled: boolean
fcmTokens: string[]
notificationPreferences: {
  tournamentStart: boolean
  tournamentEndingSoon: boolean
  tournamentRankingUpdated: boolean
  tournamentEntryApproved: boolean
  groupCatchPosted: boolean
  aiReportReady: boolean
  systemNotice: boolean
}
notificationUpdatedAt
```

同じ token は Firestore の `arrayUnion` で重複保存されないようにしています。

### テスト通知

1. `/settings/notifications` を開きます。
2. 「通知を有効にする」を押します。
3. ブラウザの通知許可を許可します。
4. 「テスト通知を送る」を押します。

通知が届かない場合は、OS・ブラウザ・サイト単位の通知設定を確認してください。

### iOS PWA の注意点

iPhone / iPad では Web Push の挙動に制約があります。

- Safariで開いただけでは通知が使えない場合があります。
- ホーム画面に追加したPWAとして起動した場合のみ通知が使えることがあります。
- iOS、Safari、PWAのバージョンによって挙動が変わります。
- 通知許可を拒否した場合、ブラウザ設定から許可し直す必要があります。

### Android / Chrome の確認方法

Android Chrome では、通常のWebページまたはホーム画面追加後のPWAで通知を確認できます。

確認ポイント:

- サイトの通知権限が「許可」になっている
- `/firebase-messaging-sw.js` が配信されている
- `/manifest.json` が配信されている
- Vercelに `NEXT_PUBLIC_FIREBASE_VAPID_KEY` とサービスアカウント環境変数が設定されている

### 実装上の方針

通知は補助機能です。通知送信に失敗しても、釣果投稿、大会承認、グループ投稿、AIレポート生成などの本体機能は止めない設計にしています。

## 多言語対応基盤

TSURILOGUE は将来的な国際展開に備えて、`next-intl` を使った日本語・英語対応の基盤を追加しています。

対応ロケール:

```text
/ja
/en
```

既存URLへアクセスした場合は、まず日本語版の `/ja` へリダイレクトします。

例:

```text
/post -> /ja/post
/groups -> /ja/groups
```

### 実装方針

- middleware で `/ja` `/en` を判定します。
- 既存ページは大きく移動せず、ロケール付きURLを既存ページへ内部的にrewriteしています。
- 既存機能を壊さず、共通UIから段階的に翻訳を広げる設計です。
- フッターの言語切替から日本語・英語を切り替えられます。
- ログイン済みユーザーが切り替えた場合、`users.preferredLocale` に保存します。

### 翻訳ファイル

翻訳文言は以下で管理します。

```text
messages/ja.json
messages/en.json
```

現在は共通メニュー、ログイン、釣果投稿、大会、グループなど主要文言から翻訳を開始しています。

### 投稿データの扱い

ユーザーが入力した以下の内容は自動翻訳しません。

- 釣果コメント
- グループ説明
- 大会説明
- 自己紹介

投稿フォームの入力項目も増やしていません。

### 魚種・釣りジャンル辞書

将来的に魚種名や釣りジャンルをコード管理できるように、以下の辞書を用意しています。

```text
src/lib/fishingDictionary.ts
```

現時点では既存投稿の自由入力を壊さないため、入力方式はそのままです。

### 日付・数値・単位

ロケールに応じた日付・数値・単位表示のため、以下のヘルパーを用意しています。

```text
src/lib/localeFormat.ts
```

今後、各画面の表示を段階的にこのヘルパーへ寄せていきます。

### 今後の拡張予定

- ページ本文の翻訳範囲を拡大
- プロフィールでの既定言語設定
- AIレポートの英語出力
- 魚種・釣りジャンルのコード選択化
- SEO metadata のロケール別最適化
- OGP文言の英語対応

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

## ユーザーフィードバック機能

TSURILOGUEのMVP利用者から、自然なタイミングで感想や不満を集めるための機能です。

ブランド名は将来変更できるよう、以下で定数管理しています。

```text
src/lib/brand.ts
```

現在の表示名は `TSURILOGUE` / `釣りローグ` です。

### feedbacks コレクション

ユーザーの回答は Firestore の `feedbacks` コレクションに保存します。

```text
feedbacks/{feedbackId}
- userId
- appName
- trigger
- rating
- category
- comment
- path
- userAgent
- locale
- createdAt
- appVersion
```

`createdAt` は `serverTimestamp()` で保存します。

### 表示トリガー

現在は以下のタイミングで取得します。

- 釣果投稿完了後: `after_catch_created`
- AIレポート閲覧後: `after_ai_report_viewed`
- 手動送信ページ: `manual_feedback`

釣果投稿後は、初回投稿後と3回目投稿後に表示します。

### 表示頻度制御

ユーザーごとの表示状態は `users/{userId}.feedbackState` に保存します。

```text
feedbackState:
- afterCatchCreatedShownCount
- lastShownAt
- lastSubmittedAt
- dismissedAt
```

初期ルール:

- 初回釣果投稿後に表示
- 3回目釣果投稿後に表示
- 一度閉じたら7日間は非表示
- 一度送信したら14日間は非表示

### 手動フィードバック

ログインユーザーは `/feedback` からいつでも送信できます。

カテゴリ:

- 全体について
- 不具合
- 改善要望
- 釣果ログ
- AIレポート
- グループ
- 大会
- 釣果デジタル証明
- 位置情報保護
- Premium

### 管理者画面

管理者は `/admin/feedbacks` からフィードバック一覧を確認できます。

表示項目:

- createdAt
- rating
- category
- trigger
- comment
- userId
- path
- locale

カテゴリ、評価、トリガーで絞り込みできます。

### Firestore Rules 方針

既存の Firestore Rules を運用している場合は、以下の方針を追加してください。

```js
match /feedbacks/{feedbackId} {
  allow create: if request.auth != null
    && request.resource.data.userId == request.auth.uid;
  allow read: if isAdmin();
  allow update, delete: if false;
}
```

`isAdmin()` は既存の管理者判定に合わせて定義してください。一般ユーザーに他人のフィードバック一覧を読ませないことが重要です。

### 今後追加予定

- NPS
- 機能別満足度
- Premium課金意向
- ユーザーインタビュー候補抽出

## SEO / Search Console 対応

TSURILOGUE は Google Search Console で登録しやすいように、Next.js App Router の `MetadataRoute` で `sitemap.xml` と `robots.txt` を生成します。

### sitemap.xml

`/sitemap.xml` は `src/app/sitemap.ts` で生成します。

現在の登録対象:

- `/`
- `/features`
- `/pricing`
- `/install`
- `/feedback`
- `/app/ja`
- `/app/en`

メディアトップは `src/app/sitemap.ts` に `/ja/media` として登録しています。

### TSURILOGUE Headless Media

SEOメディアは、WordPressをCMS専用として利用し、表示は Next.js App Router で行います。

公開URL:

```text
https://www.tsurilogue.com/ja/media
https://www.tsurilogue.com/ja/media/{slug}
https://www.tsurilogue.com/ja/media/category/{slug}
https://www.tsurilogue.com/ja/media/tag/{slug}
```

WordPress API Origin:

```text
https://tsurilogue.tapiyota.com
```

利用API:

```text
GET /wp-json/tsurilogue/v1/posts
GET /wp-json/tsurilogue/v1/posts/{slug}
GET /wp-json/tsurilogue/v1/categories
GET /wp-json/tsurilogue/v1/tags
```

実装ファイル:

```text
src/lib/wordpress.ts
src/app/media/page.tsx
src/app/media/[slug]/page.tsx
src/app/media/category/[slug]/page.tsx
src/app/media/tag/[slug]/page.tsx
src/components/media/
```

`/ja/media` は既存middlewareにより内部的に `/media` へrewriteされ、Next.js側のMediaページを表示します。

WordPressのJIN等の表示テーマは使わず、REST APIで取得した投稿データをTSURILOGUEのデザインシステムで描画します。

キャッシュ方針:

- `fetch(..., { next: { revalidate: 3600 } })`
- 1時間を目安にISR/キャッシュ

オンデマンド再検証:

- WordPress記事更新時に `POST /api/revalidate` を呼ぶと、Next.js側のMediaページを即時再検証できます。
- APIは `WORDPRESS_REVALIDATE_SECRET` で保護します。
- `slug` を渡すと `/media/{slug}` と `/ja/media/{slug}`、一覧 `/media` / `/ja/media`、`/sitemap.xml` を再検証します。
- `categorySlug` / `tagSlug`、または `categories` / `tags` を渡すとカテゴリ・タグ一覧も再検証します。
- API取得キャッシュは `wordpress-media` tag で管理し、再検証時に `revalidateTag("wordpress-media")` で破棄します。

リクエスト例:

```bash
curl -X POST https://tsurilogue.com/api/revalidate \
  -H "content-type: application/json" \
  -H "x-revalidate-secret: ${WORDPRESS_REVALIDATE_SECRET}" \
  -d '{"slug":"what-is-catch-log","categorySlug":"beginner","tags":["catch-log"]}'
```

WordPress側から送るJSON例:

```json
{
  "slug": "what-is-catch-log",
  "categorySlug": "beginner",
  "tags": ["catch-log"]
}
```

SEO方針:

- canonical は `https://www.tsurilogue.com/ja/media` 配下を基準にする
- title / description / OGP / Twitter Card は Next.js metadata で生成する
- 記事詳細では Article JSON-LD / Breadcrumb JSON-LD / Organization JSON-LD を出力する
- 記事が見つからない場合は `notFound()` を使う

### TSURILOGUE Living Components

Living Components は、Headless Mediaの記事本文にTSURILOGUEアプリ側の釣果データや分析結果を差し込むためのコンポーネント基盤です。

目的:

- WordPress記事を静的な読み物で終わらせず、アプリ内の釣果データと接続する
- 記事テーマに関連する釣果傾向、条件、AI分析、Catch Proof、Premium分析を段階的に表示する
- 将来的にFirebase集計データ、AIレポート、Premium導線へ差し替えやすい構造にする

初期実装:

```text
src/components/media/living/LiveDataBlock.tsx
src/components/media/living/FishingConditionsBlock.tsx
src/components/media/living/AIInsightBlock.tsx
src/components/media/living/CatchProofBlock.tsx
src/components/media/living/PremiumInsightBlock.tsx
```

Phase2 Ver1では `LiveDataBlock` のみ記事詳細ページに表示します。表示データはダミーですが、`data` propで以下を受け取れるため、後からFirebase集計値に差し替えられます。

- 直近30日の投稿数
- 平均サイズ
- 最大サイズ
- 人気時間帯
- 人気魚種
- 人気エリア

今後の拡張:

- 記事カテゴリやタグに応じて表示データを切り替える
- Firebase Functions等で集計済みデータを生成する
- Premiumユーザー向けの詳細分析ブロックを出し分ける
- AIではなく実データを先に表示し、その後AI要約へ接続する

WordPress側はCMS・API配信に専念し、公開表示とSEO metadata はNext.js側で管理します。

公開URL:

```text
https://tsurilogue.com/sitemap.xml
```

### robots.txt

`/robots.txt` は `src/app/robots.ts` で生成します。

内容は全ページのクロールを許可し、サイトマップを明示します。

```text
User-agent: *
Allow: /

Sitemap: https://tsurilogue.com/sitemap.xml
```

公開URL:

```text
https://tsurilogue.com/robots.txt
```

### canonical

主要ページは `src/lib/metadata.ts` の `createPageMetadata()` を使い、canonical と OGP をまとめて設定します。

例:

- `https://tsurilogue.com/`
- `https://tsurilogue.com/features`
- `https://tsurilogue.com/pricing`
- `https://tsurilogue.com/install`

`NEXT_PUBLIC_APP_URL` が設定されていない場合は、canonical の基準URLとして `https://tsurilogue.com` を使います。

### Search Console 設定方法

1. Google Search Console を開きます。
2. プロパティを追加します。
3. ドメインプロパティ、または URL プレフィックスで `https://tsurilogue.com` を登録します。
4. 指示に従って所有権確認を行います。
5. 「サイトマップ」から `https://tsurilogue.com/sitemap.xml` を送信します。
6. `/robots.txt` と `/sitemap.xml` がブラウザで表示できることを確認します。

Search Console に反映されるまで時間がかかる場合があります。
