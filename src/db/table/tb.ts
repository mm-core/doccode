import dataWrap from '@mmstudio/an000060';
import getDb from '../db';

const db = getDb();

/**
 * 编码表
 */
export interface IDoccode {
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

type IData = IDoccode;
const tableName = process.env.DOCCODE_TB || 'mmdoccode';

/**
 * 编码表
 */
export default function tbDoccode() {
	return {
		// /**
		//  * sql查询 ！！！ 慎用
		//  */
		// raw<T = any>(sql: string, ...bindings: any[]) {
		// 	return db.raw(sql, ...bindings) as unknown as T;
		// },
		async create() {
			if (await db.schema.hasTable(tableName)) {
				return true;
			}
			return db.schema.createTable(tableName, (builder) => {
				builder.comment('编码表');
				builder.string('name').comment('编码代号').notNullable();
				builder.integer('len').comment('编码数字位长度');
				builder.bigInteger('code').comment('当前编号');
			});
		},
		...dataWrap<IData>(db, tableName)
	};
}
