# 编码服务

## Description

生成唯一全局编码。

编码配置均需要有前缀，同时前缀也作为编码的名称，即数据库中`id`字段值。该服务免配置，但也可以在数据库中对配置表进行修改.

## 注意

服务不可部署多个实例

另外，由于该服务生成编号时为了保证生成的编号唯一，需要排队处理大量的并发请求，所以在使用中，请一定避免多次调用。

## 部署

1. 生成配置表，根据实际部署情况修改
1. 安装`yarn add @mmstudio/doccode`
1. 启动`./node_moduels/.bin/mm-doccode`

## Useage

```sh
curl http://127.0.0.1:8890 -d 'name=foo&num=1'
# ["foo000001"]
curl http://127.0.0.1:8890 -d 'name=foo&num=3'
# ["bar000001","bar000002","bar000003"]
curl http://127.0.0.1:8890 --header "Content-Type:application/json" -d '{"name":"foo","num:1}'
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

以下，`sys`为固定配置名

```json
{
	"port": 8890,
	"dbs": {
		"sys": {
			"type": "postgres",
			"source": "postgres://mmstudio:Mmstudio123@127.0.0.1:5432/mmstudio"
		}
	}
}
```

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
