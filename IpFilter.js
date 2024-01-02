const { default: IP2Region } = require('ip2region');
module.exports = class IpFilter {
    config = {}
    searcher = null
    constructor(config) {
        this.config = config
    }

    Init() {
        this.searcher = new IP2Region
    }

    _log(ip, result, logLevel) {
        console.log(`${logLevel}:${ip} ${result.country}-${result.province}-${result.city}-${result.isp}`)
    }

    async Search(ip) {
        return this.searcher.search(ip)
    }

    async Filter(ip, logLevel='warn') {
        const result = await this.Search(ip)
        if (logLevel === 'info') {
            this._log(ip, result, logLevel)
        }
        if (result.isp === '本机地址') return {
            safe: true,
            info: result
        }
        if (this.config.ipFilterMode === 'whiteList') {
            if(!(this.config.ipWhiteList.includes(result.country))) {
                if (logLevel === 'warn') {
                    this._log(ip, result, logLevel)
                }
                return {
                    safe: false,
                    info: result
                };
            }
            return {
                safe: true,
                info: result
            };
        }

        return {
            safe: true,
            info: result
        };
    }
}