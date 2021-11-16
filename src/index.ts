#!/usr/bin/env node
import config from '@mmstudio/config';
import express from 'express';
import bodyParser from 'body-parser';
import 'anylogger-log4js';
import { configure } from 'log4js';
import anylogger from 'anylogger';
import an49 from '@mmstudio/an000049';

interface IDoccode {
	/**
	 * 编码代号
	 */
	name: string;
	/**
	 * 编码数字位长度
	 */
	len: number;
	/**
	 * 当前编号
	 */
	code: number;	// 字段为 bigint
}

const logger = anylogger('doccode');
let lock = false;
const port = config.port as number;
const tbname = 'mmdoccode';

function tb() {
	const db = an49();
	return db<IDoccode>(tbname);
}

async function query(name: string, num: number, len: number) {
	const r001 = await tb().select('name', 'len', 'code').where('name', name).andWhere('len', len).first();
	logger.debug(tbname, r001);
	if (r001) {
		const no = Number(r001.code) + num;
		await tb().update('code', no).where('name', name).andWhere('len', len);
		return prefix(name, no, r001.len, num);
	}
	await tb().insert({
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
	const db = an49();
	// 在有些时候，管理员分配的数据库操作权限不能够创建表，需要预先把表创建好.
	await db.schema.createTableIfNotExists(tbname, (builder) => {
		builder.comment('编码表');
		builder.string('name').comment('编码代号').notNullable();
		builder.integer('len').comment('编码数字位长度');
		builder.bigInteger('code').comment('当前编号');
	});
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

	const server = app.post('/', async (req, res) => {
		const headers = req.headers;
		logger.debug('headers', headers);
		logger.debug('body', req.body);
		logger.debug('query', req.query);
		const body = req.body as { name: string; num: string; len: string; };
		const req_query = req.query as { name: string; num: string; len: string; };
		const name = body.name || req_query.name || req.params.name;
		const len = body.len || req_query.len || req.params.len;
		const num = body.num || req_query.num || req.params.num;
		const tm = new Date();
		const dbgmsg = `name=${name},num:${num},headers=${JSON.stringify(headers)},body=${JSON.stringify(body)}`;
		logger.info(`Message incomming:${dbgmsg}`);
		try {
			if (!name) {
				throw new Error('name required');
			}
			if (!num) {
				throw new Error('num required');
			}
			const no = await get_next_no(name, num ? parseInt(num, 10) : 1, len ? parseInt(len, 10) : 6);
			logger.info('Result:', no, 'for', name);
			res.json(no);
		} catch (err) {
			logger.trace(err);
			const e_msg = (err as Error).message;
			logger.error(`Service Error:${e_msg}`);
			res.status(500).json({
				detail: (err as Error).stack,
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
	server.listen(port);
}

async function main() {
	process.on('SIGINT', () => {
		process.exit(0);
	});

	configure('./log4js.json');
	logger.warn('Starting doccode service...........^v^');
	await init_db();
	init_http();
	logger.warn(`doccode service is started at port ${port}...........^v^`);
}

void main();
