# 编码服务

## Description

生成唯一全局编码。

编码配置均需要有前缀，同时前缀也作为编码的名称，即数据库中`id`字段值。该服务免配置，但也可以在数据库中对配置表进行修改.

## 注意

该服务**不可部署多个实例**

另外，由于该服务生成编号时为了保证生成的编号唯一，需要排队处理大量的并发请求，所以在使用中，请一定避免多次调用。

## 部署

1. 生成配置表，根据实际部署情况修改
1. 安装`yarn add @mmstudio/doccode pg`(`pg` for PostgreSQL, `mysql` for MySQL/MariaDB, `sqlite3` for SQLite3, `oracledb` for Oracle, or `mssql` for MSSQL )
1. 启动`./node_moduels/.bin/mm-doccode`

## Useage

```sh
curl http://127.0.0.1:8890 -d 'name=foo&num=1'
# ["foo000001"]
curl http://127.0.0.1:8890 -d 'name=foo&num=3'
# ["bar000001","bar000002","bar000003"]
curl http://127.0.0.1:8890 --header "Content-Type:application/json" -d '{"name":"foo","num":1}'
# ["foo000002"]
curl http://127.0.0.1:8890 -d 'name=20200204&num=10&len=3'
# ["20200204001","20200204002","20200204003","20200204004","20200204005","20200204006","20200204007","20200204008","20200204009","20200204010"]
curl http://127.0.0.1:8890 -d 'name=20200204&num=10&len=2'
# ["2020020401","2020020402","2020020403","2020020404","2020020405","2020020406","2020020407","2020020408","2020020409","2020020410"]
```

经以上调用之后，数据库表如下:

id | len | no
---|---|---
foo | 6 | 2
bar | 6 | 5
20200204 | 3 | 10
20200204 | 2 | 10

## Configuration

### mm.json

postgre

```json
{
	"port": 8890,
	"dbconfig": {
		"client": "pg",
		"connection": "postgres://mmstudio:Mmstudio123@127.0.0.1:5432/mmstudio"
	}
}
```

mysql/mariadb

```json
{
	"port": 8890,
	"dbconfig": {
		"client": "mysql",
		"connection": "mysql://mmstudio:Mmstudio123@127.0.0.1:3306/mmstudio?connectionLimit=5"
	}
}}
```

另外，也支持mssql，oracle，和sqlite。

### log4js.json

```json
{
	"appenders": {
		"out": {
			"type": "stdout"
		},
		"console": {
			"type": "console"
		},
		"dateFile": {
			"type": "dateFile",
			"filename": "./logs/mm.log",
			"maxLogSize": 10240000,
			"backups": 30
		}
	},
	"categories": {
		"default": {
			"appenders": [
				"console",
				"dateFile"
			],
			"level": "debug"
		}
	}
}
```

## Table

字段名称|类型|说明
---|---|---
id|text|关键字，如果配置表有该项，则使用该项配置，如没有，则自动创建，也作为前缀
len|smallint|编码长度，仅包含数字长度，不包含前缀长度，默认为6位
no|bigint|当前编号，自动创建时默认起始编号为1

## docker-compose

[docker-compose安置](https://download.daocloud.io/Docker_Mirror/Docker_Compose)

```sh
[sudo] docker-compose -f db.yaml up
```

db.yaml

```yaml
version: '3.7'

services:
  postgres:
    image: postgres
    container_name: postgres
    volumes:
      - /home/taoqf/data/postgre:/var/lib/postgresql/data
    restart: always
    environment:
      POSTGRES_DB: mmstudio
      POSTGRES_USER: mmstudio
      POSTGRES_PASSWORD: Mmstudio123
    ports:
      - 5432:5432

  adminer:
    container_name: adminer
    image: adminer
    restart: always
    ports:
      - 8080:8080
# networks:
#   default:
```
