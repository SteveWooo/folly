const templates = {
    express404: {
        code: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        text: require('./express404')
    }
}
module.exports = class Responser {
    config = {}
    constructor(config) {
        this.config = config
    }

    Init() {

    }

    async Response(req, res, ipFilterRes, template = 'express404') {
        let tmp;
        if (!(template in templates)) { tmp = template['express404'] }
        tmp = templates[template]

        res.writeHead(tmp.code, tmp.headers);
        res.end(tmp.text({
            path: req.url
        }));
        return 
    }
}