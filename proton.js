import puppeteer from 'puppeteer';
import querystring from 'querystring';
import cryptoRandomString from 'crypto-random-string';
import fetch from 'node-fetch';

var email, emlprm;

function getRandomInt(max) {
	return Math.floor(Math.random() * Math.floor(max));
}

async function delay(ms) {
	return await new Promise(resolve => setTimeout(resolve, ms));
}

async function email_generator(){
	var fetcher = await fetch("https://generator.email/", {
		"headers": {
			"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
			"accept-language": "en-US,en;q=0.9",
			"cache-control": "no-cache",
			"pragma": "no-cache",
			"sec-ch-ua": "\"Chromium\";v=\"104\", \" Not A;Brand\";v=\"99\", \"Google Chrome\";v=\"104\"",
			"sec-ch-ua-mobile": "?0",
			"sec-ch-ua-platform": "\"Windows\"",
			"sec-fetch-dest": "document",
			"sec-fetch-mode": "navigate",
			"sec-fetch-site": "none",
			"sec-fetch-user": "?1",
			"upgrade-insecure-requests": "1"
		},
		"referrerPolicy": "strict-origin-when-cross-origin",
		"body": null,
		"method": "GET",
		"mode": "cors",
		"credentials": "omit"
	})
	.then(response=>{
		return response.text();
	})
	.then(body=>{
		email = body.substr(body.indexOf('id="email_ch_text">') + 19);
		email = email.substring(0, email.indexOf('<'));
		emlprm = email.split('@');
		emlprm = querystring.stringify({
			surl: emlprm[1] + '/' + emlprm[0]
		});
		console.log('disposable email: ' + email);
	})
	.catch(function (err) {
		console.error("error on htttp://generator.email: ", err);
		throw(err);
	});
}

async function get_verify_code(){
	var vcode = null;
	for (let index = 0; index < 200; index++) {
		var fetcher = await fetch("https://generator.email/", {
			"headers": {
				"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
				"accept-language": "en-US,en;q=0.9",
				"cache-control": "no-cache",
				"pragma": "no-cache",
				"sec-ch-ua": "\"Chromium\";v=\"104\", \" Not A;Brand\";v=\"99\", \"Google Chrome\";v=\"104\"",
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-platform": "\"Windows\"",
				"sec-fetch-dest": "document",
				"sec-fetch-mode": "navigate",
				"sec-fetch-site": "none",
				"sec-fetch-user": "?1",
				"upgrade-insecure-requests": "1",
				"cookie": emlprm
			},
			"referrerPolicy": "strict-origin-when-cross-origin",
			"body": null,
			"method": "GET",
			"mode": "cors",
			"credentials": "omit"
		})
		.then(response=> response.text())
		.then(body=>{
			if(body.indexOf('Proton verification code') > -1){
				vcode = body.substr(body.indexOf('Proton verification code') + 24);
				vcode = vcode.substring(vcode.indexOf('2em">') + 5, vcode.indexOf('</code>'));
				console.log('proton code : ' + vcode);
			}
		})
		.catch(function (err) {
			console.error("error on check htttp://generator.email: ", err);
			//throw(err);
		});
		if(vcode != null && vcode != ''){
			break;
		}
		await delay(2000);
	}
	if(vcode == null || vcode == '')
		throw('error on get proton code after 200 times try');
	return vcode;
}

(async () => {
	var browser, pg;
	var load_pg = await new Promise(function (resolve, reject) {
		(async function load_pg() {
			try {
				await email_generator();
				
				browser = await puppeteer.launch({
					headless: false,
					args: ['--disable-web-security']
				});
				pg = await browser.newPage();

				//puppeteer anti detection measures:  https://intoli.com/blog/not-possible-to-block-chrome-headless/
				// Pass the User-Agent Test.
				//await pg.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36');
				// Pass the Webdriver Test.
				await pg.evaluateOnNewDocument(() => {
					Object.defineProperty(navigator, 'webdriver', {
						get: () => false,
					});
				});
				// Pass the Permissions Test.
				await pg.evaluateOnNewDocument(() => {
					const originalQuery = window.navigator.permissions.query;
					return window.navigator.permissions.query = (parameters) => (
						parameters.name === 'notifications' ?
						Promise.resolve({
							state: Notification.permission
						}) :
						originalQuery(parameters)
					);
				});

				await pg.goto('https://account.protonvpn.com/signup', {
					//waitUntil: ['load','domcontentloaded','networkidle0'],
					waitLoad: true, 
					waitNetworkIdle: true,
					timeout: 60 * 1000
				});
				await pg.waitForSelector('form[name="accountForm"] button[type="submit"]', {
					timeout: 60 * 1000
				});
				await pg.waitForSelector('input#email', {
					timeout: 60 * 1000
				});
				await delay(2000);
				var uname = cryptoRandomString({
					length: 13,
					characters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
				});
				var pwd = cryptoRandomString({
					length: 13,
					characters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_!.'
				});
				await pg.focus('#email');
				await pg.type('#email', uname);
				
				await pg.focus('input#recovery-email');
				await pg.type('input#recovery-email', email);
				
				await pg.focus('input#password');
				await pg.type('input#password', pwd);

				await pg.focus('input#repeat-password');
				await pg.type('input#repeat-password', pwd);

				await pg.click('form[name="accountForm"] button[type="submit"]');

				await pg.waitForFunction(`[...document.querySelectorAll('button')].filter(txt => txt.innerHTML.includes('Continue with Free')).length > 0`);
				await pg.evaluate(() => [...document.querySelectorAll('button')].filter(txt => txt.innerHTML.includes('Continue with Free'))[0].click());
				await pg.waitForSelector('button[data-testid="tab-header-Email-button"]');
				await pg.click('button[data-testid="tab-header-Email-button"]');
				
				
				while(true){
					//handle error "Email verification temporarily disabled for this email domain. Please try another verification method"
					await pg.evaluate(() => document.querySelector('input#email').value = '');
					await pg.$eval('#email', el => el.value = '');
					await pg.focus('input#email');
					await pg.type('input#email', email);
					await pg.evaluate(() => [...document.querySelectorAll('button')].filter(txt => txt.innerText == 'Get verification code')[0].click());
					try {
						await pg.waitForFunction(`[...document.querySelectorAll('button')].filter(txt => txt.innerText == 'Verify').length > 0`, {timeout: 10*1000});
						break;
					} catch (error) {
						await email_generator();
					}
					await delay(1000);
				}
				await pg.waitForFunction(`[...document.querySelectorAll('button')].filter(txt => txt.innerText == 'Verify').length > 0`, {timeout: 10*1000});
				var vcode = await get_verify_code();

				await pg.focus('input#verification');
				await pg.type('input#verification', vcode);
				await pg.waitForFunction(`[...document.querySelectorAll('button')].filter(txt => txt.innerText == 'Verify').length > 0`);
				await pg.evaluate(() => [...document.querySelectorAll('button')].filter(txt => txt.innerText == 'Verify')[0].click());
				while(true){
					//handle error "Email already used"
					try {
						await pg.waitForFunction(`[...document.querySelectorAll('a span')].filter(txt => txt.innerText == 'Dashboard').length > 0`, {timeout: 15*1000});
						break;
					} catch (error) {
						var email_box = await pg.evaluate(() => {return document.querySelector('code') != null;});
						if(!email_box){
							await pg.waitForFunction(`[...document.querySelectorAll('button')].filter(txt => txt.innerText == "Didn't receive the code?").length > 0`);
							await pg.evaluate(() => [...document.querySelectorAll('button')].filter(txt => txt.innerText == "Didn't receive the code?")[0].click());
							await pg.waitForFunction(`[...document.querySelectorAll('button')].filter(txt => txt.innerText == 'Edit email address').length > 0`);
							await pg.evaluate(() => [...document.querySelectorAll('button')].filter(txt => txt.innerText == "Edit email address")[0].click());
							await pg.waitForFunction(`[...document.querySelectorAll('button')].filter(txt => txt.innerText == 'Get verification code').length > 0`);	
						}
						await pg.waitForSelector('input#email', {
							timeout: 60 * 1000
						});
						await email_generator();
						await pg.evaluate(() => document.querySelector('input#email').value = '');
						await pg.$eval('#email', el => el.value = '');
						await pg.focus('input#email');
						await pg.type('input#email', email);
						await pg.evaluate(() => [...document.querySelectorAll('button')].filter(txt => txt.innerText == 'Get verification code')[0].click());
						try {
							await pg.waitForFunction(`[...document.querySelectorAll('button')].filter(txt => txt.innerText == 'Verify').length > 0`, {timeout: 10*1000});
							var vcode = await get_verify_code();
							await pg.focus('input#verification');
							await pg.type('input#verification', vcode);
							await pg.evaluate(() => [...document.querySelectorAll('button')].filter(txt => txt.innerText == 'Verify')[0].click());
						} catch (error) {}
					}
					await delay(1000);
				}

				await pg.waitForFunction(`[...document.querySelectorAll('a span')].filter(txt => txt.innerText == 'Account').length > 0`);
				await pg.evaluate(() => [...document.querySelectorAll('a span span')].filter(txt => txt.innerText == 'Account')[0].click());
				await pg.waitForFunction(`[...document.querySelectorAll('a span span')].filter(txt => txt.innerText == 'OpenVPN / IKEv2 username').length > 0`);
				await pg.evaluate(() => [...document.querySelectorAll('a span span')].filter(txt => txt.innerText == 'OpenVPN / IKEv2 username')[0].click());
				await pg.click('button[title="Show"]');
				var user_pass = await pg.evaluate(() => {return [...document.querySelectorAll('code')].map(x => x.textContent); });
				console.log('username: ' + uname);
				console.log('password: ' + pwd);
				console.log('email: ' + email);
				console.log("openvpn username: "+user_pass[0]);
				console.log("openvpn password: "+user_pass[1]);
				console.log('try your new ProtonVPN account ;-)')
				browser.close();
			} catch (e) {
				console.error('error:', e);
				/*console.log('loading page failed, retrying...');
				await delay(1000);
				browser.close();
				return load_pg();*/
			};
		})();
	});
})();