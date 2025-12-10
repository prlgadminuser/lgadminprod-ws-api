
const { Discord } = require('./index');
const { webhookURL } = require('./idbconfig');

const webhook = new Discord.WebhookClient({
    url: webhookURL,
  });

  module.exports = {
  webhook
  }