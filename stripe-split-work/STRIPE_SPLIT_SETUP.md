# Stripe 五五分成配置 Configuration du partage Stripe 50 % 50 %

管理员页面现在只会在服务端调用 Stripe。上线前需要完成以下配置。

La page d'administration appelle désormais Stripe uniquement côté serveur. Avant la mise en production, effectuez cette configuration.

1. 在 Stripe Connect 中准备两个已启用 `transfers` 能力的关联账号。
   Préparez deux comptes connectés dont la capacité `transfers` est active.

   两位管理员分别通过自己的邮箱登录。服务器根据 `STRIPE_ADMIN_1_EMAIL` 和 `STRIPE_ADMIN_2_EMAIL` 只向本人显示对应的 Connect 认证入口；Stripe 平台密钥始终只保存在服务器端。
   Chaque administrateur se connecte avec sa propre adresse e-mail. Le serveur utilise `STRIPE_ADMIN_1_EMAIL` et `STRIPE_ADMIN_2_EMAIL` pour n'afficher que son propre parcours Connect. La clé Stripe de la plateforme reste exclusivement côté serveur.

2. 在部署平台配置 `.env.example` 中列出的服务器变量。`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET` 和 `SUPABASE_SERVICE_ROLE_KEY` 绝不能暴露到浏览器。
   Configurez les variables serveur listées dans `.env.example`. Ces trois secrets ne doivent jamais être exposés au navigateur.

3. 在 Stripe Workbench 中创建 webhook endpoint：
   Créez le endpoint webhook suivant dans Stripe Workbench :

   `https://VOTRE-DOMAINE/api/stripe-webhook`

   订阅事件 Événements à écouter：

   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`

4. 应用 Supabase migration `20260808000000_stripe_split_safety.sql`。
   Appliquez la migration Supabase `20260808000000_stripe_split_safety.sql`.

5. 先使用 Stripe 测试模式完成一次支付、等待或在数据库中调整冻结日期，然后在管理员页核对两个账号状态并执行分账。
   Testez d'abord un paiement en mode test, puis vérifiez les deux comptes et lancez la répartition depuis l'administration.

6. 在 Supabase Authentication 的 URL Configuration 中，将正式网站的 `/reset-password` 完整地址加入 Redirect URLs，确保忘记密码邮件可以返回重设页面。
   Dans Supabase Authentication URL Configuration, ajoutez l'URL complète `/reset-password` du site déployé aux Redirect URLs afin que le lien de récupération ouvre la page de réinitialisation.

分账金额取每笔 Stripe 入账扣除 Stripe 手续费后的净额，再按分精确平分。若净额为单数分，第二个账号多得一分。

Le montant distribué correspond au net Stripe après frais. Si le nombre de centimes est impair, le second compte reçoit le centime restant.
