function baseHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
</head>
<body style="margin:0;padding:40px 16px;background:#f4f4f7;font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN',sans-serif;">
  <div style="max-width:480px;margin:0 auto;">

    <!-- ヘッダー -->
    <div style="background:linear-gradient(135deg,#ff6b35 0%,#ff9500 100%);border-radius:16px 16px 0 0;padding:32px 28px;text-align:center;">
      <div style="font-size:36px;margin-bottom:6px;">⚡</div>
      <div style="color:#fff;font-size:22px;font-weight:900;letter-spacing:1px;">テキパッキー</div>
      <div style="color:rgba(255,255,255,0.75);font-size:12px;margin-top:4px;">行動活性化アプリ</div>
    </div>

    <!-- ボディ -->
    <div style="background:#1a1828;padding:32px 28px;border-radius:0 0 16px 16px;">
      ${body}

      <!-- 注意書き -->
      <div style="background:#242235;border-radius:10px;padding:14px 16px;margin-top:24px;">
        <p style="color:#7c7a8e;font-size:12px;line-height:1.8;margin:0;">
          ⏱ このリンクは <strong style="color:#fffffe;">1時間</strong> 有効です。<br>
          このメールに心当たりがない場合は、無視してください。
        </p>
      </div>
    </div>

    <!-- フッター -->
    <p style="text-align:center;color:#9ca3af;font-size:11px;margin:20px 0 0;">
      © テキパッキー
    </p>

  </div>
</body>
</html>`;
}

export function magicLinkEmailHtml(url: string): {
  subject: string;
  html: string;
} {
  const body = `
    <h2 style="color:#fffffe;font-size:18px;font-weight:900;margin:0 0 12px;">ログインリンクをお送りします</h2>
    <p style="color:#7c7a8e;font-size:14px;line-height:1.8;margin:0 0 24px;">
      以下のボタンをクリックすると、テキパッキーへのログインが完了します。<br>
      ボタンが表示されない場合は、下記のURLを直接ブラウザで開いてください。
    </p>

    <div style="text-align:center;margin:0 0 16px;">
      <a href="${url}"
         style="display:inline-block;background:linear-gradient(135deg,#ff6b35,#ff9500);color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 40px;border-radius:12px;">
        ログインする →
      </a>
    </div>

    <p style="text-align:center;">
      <a href="${url}" style="color:#7c7a8e;font-size:11px;word-break:break-all;">${url}</a>
    </p>
  `;
  return {
    subject: "【テキパッキー】ログインリンクのご案内",
    html: baseHtml("ログインリンク", body),
  };
}

export function emailChangeEmailHtml(url: string): {
  subject: string;
  html: string;
} {
  const body = `
    <h2 style="color:#fffffe;font-size:18px;font-weight:900;margin:0 0 12px;">メールアドレス変更の確認</h2>
    <p style="color:#7c7a8e;font-size:14px;line-height:1.8;margin:0 0 24px;">
      テキパッキーのメールアドレス変更リクエストを受け付けました。<br>
      以下のボタンをクリックして変更を完了してください。
    </p>

    <div style="text-align:center;margin:0 0 16px;">
      <a href="${url}"
         style="display:inline-block;background:linear-gradient(135deg,#ff6b35,#ff9500);color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 40px;border-radius:12px;">
        メールアドレスを変更する →
      </a>
    </div>

    <p style="text-align:center;">
      <a href="${url}" style="color:#7c7a8e;font-size:11px;word-break:break-all;">${url}</a>
    </p>
  `;
  return {
    subject: "【テキパッキー】メールアドレス変更の確認",
    html: baseHtml("メールアドレス変更の確認", body),
  };
}
