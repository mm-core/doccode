import an49, { Config } from '@mmstudio/an000049';
import { loadEnvConfig } from '@next/env';

loadEnvConfig('.');

const config = JSON.parse(process.env.DOCCODE_DB!) as Config;
const db = an49(config);

export default function getDb() {
	return db;
}
