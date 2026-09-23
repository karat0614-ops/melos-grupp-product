'use strict';

/* Мозг бота-приёмщика заявок: Melos Grupp, лазерная резка.
   Telegram здесь нет специально — логика отлаживается локально,
   подключение к каналу отдельным шагом. Сценарий: scenario.md */

const fs = require('fs');
const path = require('path');

const LEADS_FILE = path.join(__dirname, 'leads.json');

const GREETING =
  'Здравствуйте! Это Melos Grupp, лазерная резка в Петербурге. ' +
  'Сейчас соберу данные для расчёта — пять коротких вопросов, минуты не займёт.';

const STEPS = [
  { field: 'что_резать', ask: 'Что нужно порезать? Материал и примерно что за деталь.' },
  { field: 'толщина',    ask: 'Какая толщина металла?' },
  { field: 'количество', ask: 'Сколько деталей нужно?' },
  { field: 'срок',       ask: 'Когда нужно? Если горит — так и напишите, посмотрим, что можно сделать.' },
  { field: 'контакт',    ask: 'Куда прислать расчёт — телефон или Telegram?' }
];

const RETRY = 'Не разобрал. Напишите, пожалуйста, ещё раз — или оставьте телефон, перезвоним.';
const GIVE_UP = 'Давайте проще: оставьте телефон, перезвоним и всё уточним голосом.';

/* Ответ считается понятным, если в нём есть хоть что-то осмысленное.
   Намеренно мягко: бот, который придирается к формату, теряет клиентов. */
function isMeaningful(answer) {
  return typeof answer === 'string' && answer.trim().length >= 2;
}

function createDialog() {
  const lead = {};
  let step = 0;
  let attempts = 0;
  let finished = false;

  return {
    start() {
      return [GREETING, STEPS[0].ask];
    },

    /* Принимает ответ человека, возвращает реплики бота. */
    receive(answer) {
      if (finished) return [];

      if (!isMeaningful(answer)) {
        attempts += 1;
        if (attempts >= 2) {
          finished = true;
          return [GIVE_UP];
        }
        return [RETRY];
      }

      lead[STEPS[step].field] = answer.trim();
      attempts = 0;
      step += 1;

      if (step < STEPS.length) return [STEPS[step].ask];

      finished = true;
      return [this.finalReply()];
    },

    finalReply() {
      return (
        `Понял — ${lead['что_резать']}, ${lead['толщина']}, ${lead['количество']} шт. ` +
        `Сделаем к сроку: ${lead['срок']}.\n` +
        'Посчитаем и вернёмся с ценой. Удобнее голосом — звоните, номер в объявлении.'
      );
    },

    isFinished() { return finished; },

    /* Заявка полная, только если есть контакт: без него она бесполезна. */
    isComplete() { return Boolean(lead['контакт']); },

    getLead() {
      return Object.assign({ принята: new Date().toISOString(), источник: 'Авито' }, lead);
    }
  };
}

function saveLead(lead) {
  let leads = [];
  if (fs.existsSync(LEADS_FILE)) {
    try {
      leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
      if (!Array.isArray(leads)) leads = [];
    } catch (e) {
      /* Битый файл не роняет приём заявок, но и не затирается молча:
         отодвигаем в сторону, чтобы данные не пропали. */
      fs.renameSync(LEADS_FILE, LEADS_FILE + '.broken-' + Date.now());
      console.error('leads.json был повреждён, сохранён рядом как .broken-*');
      leads = [];
    }
  }
  leads.push(lead);
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
  return LEADS_FILE;
}

module.exports = { createDialog, saveLead, STEPS, GREETING, LEADS_FILE };
