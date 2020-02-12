const puppeteer = require('puppeteer');
const $ = require('cheerio');
const CronJob = require('cron').CronJob;
const path = require('path');
const opn = require('opn');
const nodemailer = require('nodemailer');
const NodeCache = require( "node-cache" );
const notifier = require('node-notifier');
const Cache = new NodeCache();
Cache.set('lowestPrice', 0);

var myArgs = process.argv.slice(2);
let url = myArgs[0];

async function configureBrowser() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    return page;
}

async function checkPrice(page) {
    await page.reload();
    let html = await page.evaluate(() => document.body.innerHTML);
    // console.log(html);

    $('#priceblock_ourprice', html).each(function() {
        let dollarPrice = $(this).text();
        let currentPrice = Number(dollarPrice.replace(/[^0-9.-]/g,""));
        if(Cache.get('lowestPrice') == 0) {
          Cache.set('lowestPrice', currentPrice);
        }
        else {
          if (currentPrice < Cache.get('lowestPrice')) {
            Cache.set('lowestPrice', currentPrice);
            console.log("BUY!!!! " + currentPrice);
            // sendMail(currentPrice);
            notifier.notify({
              title: 'Price Drop Alert !',
              message: 'Price dropped to '+dollarPrice+' for '+url,
              icon: path.join(__dirname, 'amazon.png'), 
              sound: true,
              wait: true,
              actions: ['Open', 'Cancel']
            });
            notifier.on('open', () => {
              console.log('"Ok" was pressed');
              opn(url);
            });
          }
        }
    });
}

async function startTracking() {
    const page = await configureBrowser();
  
    let job = new CronJob('* */30 * * * *', function() { //runs every 30 minutes in this config
      checkPrice(page);
    }, null, true, null, null, true);
    job.start();
}

async function sendMail(price) {

    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: '*****@gmail.com',
        pass: '*****'
      }
    });
  
    let textToSend = 'Price dropped to ' + price;
    let htmlText = `<a href=\"${url}\">Link</a>`;
  
    let info = await transporter.sendMail({
      from: '"Price Tracker" <*****@gmail.com>',
      to: "*****@gmail.com",
      subject: 'Price dropped to ' + price, 
      text: textToSend,
      html: htmlText
    });
  
    console.log("Message sent: %s", info.messageId);
  }

startTracking();