'use strict';

/* Локальный прогон сценария: ни Telegram, ни сети, ни токенов.
   Запуск: node sandbox/founder/bot/dry-run.js */

const { createDialog, saveLead } = require('./bot');

/* Ответы «клиента» — как пишут на Авито: коротко и без формата. */
const ANSWERS = [
  'Нержавейка, кронштейны под полку',
  '3 мм',
  '20',
  'Хорошо бы к пятнице, горит',
  '+7 921 000-00-00'
];

function say(who, text) {
  const tag = who === 'bot' ? 'БОТ     ' : 'КЛИЕНТ  ';
  text.split('\n').forEach((line, i) => {
    console.log((i === 0 ? tag : '        ') + '│ ' + line);
  });
}

console.log('\n--- Прогон диалога ---\n');

const dialog = createDialog();
dialog.start().forEach(line => say('bot', line));

for (const answer of ANSWERS) {
  if (dialog.isFinished()) break;
  say('client', answer);
  dialog.receive(answer).forEach(line => say('bot', line));
}

console.log('\n--- Итог ---\n');

if (!dialog.isComplete()) {
  console.error('Диалог закончился без контакта — такая заявка бесполезна.');
  process.exit(1);
}

const lead = dialog.getLead();
console.log(JSON.stringify(lead, null, 2));

const file = saveLead(lead);
console.log('\nЗаявка сохранена: ' + file + '\n');
