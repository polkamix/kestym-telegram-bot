const express = require('express');
const { Telegraf } = require('telegraf');
const { google } = require('googleapis');

const app = express();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

const SHEET_ID = process.env.SHEET_ID;

const GOOGLE_CLIENT_EMAIL =
  process.env.GOOGLE_CLIENT_EMAIL;

const GOOGLE_PRIVATE_KEY =
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

const bot = new Telegraf(BOT_TOKEN);

const userState = new Map();

/* запись в таблицу */

async function addToSheet(row){

  const auth = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    null,
    GOOGLE_PRIVATE_KEY,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  const sheets = google.sheets({
    version:'v4',
    auth
  });

  await sheets.spreadsheets.values.append({

    spreadsheetId:SHEET_ID,

    range:'A:F',

    valueInputOption:'USER_ENTERED',

    requestBody:{
      values:[row]
    }

  });

}

/* старт */

bot.start(async(ctx)=>{

  const chatId = ctx.chat.id;

  userState.set(chatId,{

    step:'waiting_name'

  });

  await ctx.reply(

`Рады, что Вы приняли нашу весточку!

Назовите ваше имя`

  );

});

/* сообщения */

bot.on('text', async(ctx)=>{

  const chatId = ctx.chat.id;

  const text =
    ctx.message.text.trim();

  if(text.startsWith('/start')){
    return;
  }

  const state =
    userState.get(chatId);

  if(!state){

    await ctx.reply(
      'Чтобы начать запись, нажмите /start'
    );

    return;
  }

  /* имя */

  if(state.step === 'waiting_name'){

    state.name = text;

    state.step =
      'waiting_count';

    userState.set(
      chatId,
      state
    );

    await ctx.reply(
      'Укажите количество человек'
    );

    return;
  }

  /* количество */

  if(state.step === 'waiting_count'){

    const username =
      ctx.from.username
      ? '@'+ctx.from.username
      : '';

    const fullName =
      [
        ctx.from.first_name,
        ctx.from.last_name
      ]
      .filter(Boolean)
      .join(' ');

    await addToSheet([

      new Date()
      .toLocaleString('ru-RU'),

      username,

      fullName,

      state.name,

      text,

      'Приду'

    ]);

    userState.delete(chatId);

    await ctx.reply(

`Запись внесена!

Ждем вас в кинотеатре «Мир»
28 мая в 17:30

Купить билетик можно <a href="https://kinoteatr-mir.ru/release/10076980?date=2026-05-28">по ссылке</a>`,

{
  parse_mode:'HTML'
}

    );

    return;
  }

});

/* webhook */

app.use(
  bot.webhookCallback(
    '/telegram'
  )
);

app.get('/',(req,res)=>{

  res.send(
    'Kestym bot is alive.'
  );

});

/* запуск */

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, async()=>{

  console.log(
    `Bot running on ${PORT}`
  );

  if(WEBHOOK_URL){

    await bot.telegram.setWebhook(

      `${WEBHOOK_URL}/telegram`

    );

    console.log(
      'Webhook connected'
    );

  }

});
