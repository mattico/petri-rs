extern crate iron;
#[macro_use] extern crate log;
extern crate env_logger;
extern crate mount;
extern crate router;
extern crate staticfile;
extern crate time;
extern crate websocket;

use std::path::Path;
use std::time::Duration;

use iron::prelude::*;
use iron::{BeforeMiddleware, AfterMiddleware, typemap};
use mount::Mount;
use router::Router;
use staticfile::Static;
use time::precise_time_ns;

struct ResponseTime;

impl typemap::Key for ResponseTime { type Value = u64; }

impl BeforeMiddleware for ResponseTime {
    fn before(&self, req: &mut Request) -> IronResult<()> {
        req.extensions.insert::<ResponseTime>(precise_time_ns());
        println!("Requested url: {}", req.url.path.join("/"));
        Ok(())
    }
}

impl AfterMiddleware for ResponseTime {
    fn after(&self, req: &mut Request, res: Response) -> IronResult<Response> {
        let delta = precise_time_ns() - *req.extensions.get::<ResponseTime>().unwrap();
        println!("Request took: {} ms", (delta as f64) / 1000000.0);
        Ok(res)
    }
}


fn main() {
    env_logger::init().unwrap();
    
    // let cache_duration = Duration::from_secs(60*60*24*30);
    let cache_duration = Duration::from_secs(0);
    
    let mut mount = Mount::new();
    mount.mount("/", Static::new(Path::new("src/www")).cache(cache_duration));
    mount.mount("/favicon.ico", Static::new(Path::new("src/www/img/favicon.ico")).cache(cache_duration));
    
    let mut chain = Chain::new(mount);
    chain.link_before(ResponseTime);
    chain.link_after(ResponseTime);
    
    println!("Starting in '{}'", std::env::current_dir().unwrap().to_str().unwrap());
    
    println!("Serving on http://localhost:3000");
    Iron::new(chain).http("localhost:3000").unwrap();
}