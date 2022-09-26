#!/usr/bin/env node
import anylogger from 'anylogger';
import 'anylogger-log4js';
import bodyParser from 'body-parser';
import express from 'express';
import { configure } from 'log4js';
import tbDoccode from './db/table/tb';


const logger = anylogger('doccode');
let lock = false;

async function query(name: string, num: number, len: number) {
	const r001 = await tbDoccode()
		.first({
			name,
			len
		});
	logger.debug(r001);
	if (r001) {
		const no = Number(r001.code) + num;
		await tbDoccode()
			.update({
				code: no
			}, {
				name,
				len
			});
		return prefix(name, no, r001.len, num);
	}
	await tbDoccode()
		.insert({
			name,
			len,
			code: num
		});
	return prefix(name, num, len, num);
}

function prefix(pre: string, stop: number, len: number, num: number) {
	return Array<number>(num).fill(0).map((_v, i) => {
		const n = stop - i;
		// return pre + (Array<string>(len).join('0') + n.toString()).slice(-len);
		return pre + n.toString().padStart(len, '0');
	}).reverse();
}

async function get_next_no(name: string, num: number, len: number) {
	if (lock) {
		return new Promise<string[]>((resolve) => {
			setImmediate(() => {
				resolve(get_next_no(name, num, len));
			});
		});
	}
	lock = true;
	logger.debug('locked', name);
	try {
		return await query(name, num, len);
	} finally {
		lock = false;
		logger.debug('unlocked', name);
	}
}

async function init_db() {
	// 在有些时候，管理员分配的数据库操作权限不能够创建表，需要预先把表创建好.
	try {
		await tbDoccode().create();
	} catch (error) {
		logger.error(error);
	}
}

interface IQuery {
	name: string;
	num: string;
	len: string;
}

function init_http() {
	const app = express();
	// parse application/x-www-form-urlencoded
	app.use(bodyParser.urlencoded({
		extended: false
	}));
	// parse application/json
	app.use(bodyParser.json({
		type: '*/json'
	}));
	// parse an HTML body into a string
	app.use(bodyParser.text({
		type: 'text/html'
	}));

	// if (config.acao) {
	// 	app.use((req, res, next) => {
	// 		const acao = config.acao === '*' ? req.headers.origin as string : config.acao;
	// 		res.header('Access-Control-Allow-Origin', acao);
	// 		res.header('Access-Control-Allow-Headers', 'content-type, x-requested-with');
	// 		// res.header('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS');
	// 		res.header('Access-Control-Allow-Methods', 'POST,GET');
	// 		res.header('Access-Control-Allow-Credentials', 'true');
	// 		if (config.acma) {
	// 			res.header('Access-Control-Max-Age', config.acma.toString());	// optons请求有效时间
	// 		}
	// 		// res.setHeader('P3P', 'CP=CAO PSA OUR');
	// 		// res.setHeader('P3P', 'CP=CURa ADMa DEVa PSAo PSDo OUR BUS UNI PUR INT DEM STA div COM NAV OTC NOI DSP COR');
	// 		return next();
	// 	});
	// }

	const server = app.post<'/', IQuery, (string[]) | {
		detail: string;
		msg: string;
	}, IQuery, IQuery>('/', async (req, res) => {
		const headers = req.headers;
		logger.debug('headers', headers);
		logger.debug('body', req.body);
		logger.debug('query', req.query);
		const body = req.body;
		const req_query = req.query;
		const name = body.name || req_query.name || req.params.name;
		const len = body.len || req_query.len || req.params.len || '6';
		const num = body.num || req_query.num || req.params.num || '1';
		const tm = new Date();
		const dbgmsg = `name=${name},num:${num},headers=${JSON.stringify(headers)},body=${JSON.stringify(body)}`;
		logger.info(`Message incomming:${dbgmsg}`);
		try {
			if (!name) {
				throw new Error('name required');
			}
			const no = await (() => {
				if (Number(num) <= 0) {
					return [] as string[];
				}
				return get_next_no(name, parseInt(num, 10), parseInt(len, 10));
			})();
			logger.info('Result:', no, 'for', name);
			res.json(no);
		} catch (err) {
			logger.trace(err);
			logger.error(err);
			const e_msg = (err as Error).message;
			logger.error(`Service Error:${e_msg}`);
			res.status(500).json({
				detail: (err as Error).stack!,
				msg: e_msg
			});
		} finally {
			const cost = new Date().getTime() - tm.getTime();
			if (cost > 500) {
				logger.error(`Message outgoing:${dbgmsg},Costing ${cost}ms`);
			} else if (cost > 200) {
				logger.warn(`Message outgoing:${dbgmsg},Costing ${cost}ms`);
			} else {
				logger.info(`Message outgoing:${dbgmsg},Costing ${cost}ms`);
			}
		}
	});
	const port = parseInt(process.env.DOCCODE_PORT || '8890', 10);
	server.listen(port);
	logger.warn(`doccode service is started at port ${port}...........^v^`);
}

async function main() {
	process.on('SIGINT', () => {
		process.exit(0);
	});

	configure('./log4js.json');
	logger.warn('Starting doccode service...........^v^');
	await init_db();
	init_http();
}

void main();
