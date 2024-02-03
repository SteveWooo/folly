const http = require('http');
const httpProxy = require('http-proxy');
const IpFilter = require('./IpFilter')
const Responser = require('./responser/Responser')

class Service {
    config = {}
    ipFilter = null
    responser = null
    constructor(config) {
        this.config = config
    }

    async Init() {
        this.ipFilter = new IpFilter(this.config)
        this.ipFilter.Init()
        this.responser = new Responser(this.config)
        this.responser.Init()
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
            const ipFilterRes = await this.ipFilter.Filter(ip, 'warn', req)
            if (ipFilterRes.safe === false) {
                this.responser.Response(req, res, ipFilterRes, 'express404')
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
