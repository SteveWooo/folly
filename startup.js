const http = require('http');
const httpProxy = require('http-proxy');
const { default: IP2Region } = require('ip2region');
const express404 = require('./responser/express404');

// 过滤ip的模块
class IpFilter {
    config = {}
    searcher = null
    constructor(config) {
        this.config = config
    }

    Init() {
        this.searcher = new IP2Region
    }

    _log(result, logLevel) {
        console.log(`${logLevel}:${result.country}-${result.province}-${result.city}-${result.isp}`)
    }

    async Search(ip) {
        return this.searcher.search(ip)
    }

    async Filter(ip, logLevel='warn') {
        const result = await this.Search(ip)
        if (logLevel === 'info') {
            this._log(result, logLevel)
        }
        if (result.isp === '本机地址') return true
        if (this.config.ipFilterMode === 'whiteList') {
            if(!(this.config.ipWhiteList.includes(result.country))) {
                if (logLevel === 'warn') {
                    this._log(result, logLevel)
                }
                return false;
            }
            return true
        }

        return true
    }
}

class Service {
    config = {}
    ipFilter = null
    constructor(config) {
        this.config = config
    }

    async Init() {
        this.ipFilter = new IpFilter(this.config)
        this.ipFilter.Init()
    }

    async Run() {
        // 创建代理服务器
        const proxy = httpProxy.createProxyServer({});
        // 创建HTTP服务器
        const server = http.createServer(async (req, res) => {
            // 在请求头中添加一些信息，可选
            req.headers['x-added-header'] = 'proxy-server';
            // ======= 防火墙主要逻辑：=======
            const ip = req.socket.remoteAddress;
            if ((await this.ipFilter.Filter(ip, false)) === false) {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(express404({
                    path: req.url
                }));
                return;
            }
            // 转发请求到目标服务
            proxy.web(req, res, { target: `http://${this.config.targetHost}:${this.config.targetPort}` });
        });

        // 监听服务器的错误事件
        proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Proxy error');
        });
        // 监听服务器的端口
        server.listen(this.config.servicePort, () => {
            console.log(`Proxy server listening on port ${this.config.servicePort}`);
        });
    }
}

async function main() {
    // 本地服务的地址和端口
    const config = {
        targetHost: 'localhost',
        targetPort: 19999, // nginx端口
        servicePort: 20000, // 服务端口

        ipv4dbPath: `${__dirname}/node_modules/ip2region/data/ip2region.db`,
        ipFilterMode: 'whiteList',
        ipWhiteList: ['中国']
    }
    const service = new Service(config)
    await service.Init()
    await service.Run()
}
main()
