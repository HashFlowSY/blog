import Link from "next/link";

export default function HomePage() {
  return (
    <section
      className="page is-active"
      data-route-page="home"
      aria-labelledby="home-title"
    >
      <div className="container">
        <div className="hero">
          <div>
            <p className="eyebrow">Field note / open archive</p>
            <h1 id="home-title" data-od-id="home-headline">
              你好，我是 Hashflow
            </h1>
            <p className="lede">欢迎来到我的避难所</p>
            <div className="button-row">
              <Link className="button" href="/posts/">
                进入文章档案
              </Link>
              <Link className="button secondary" href="/projects/">
                查看项目板
              </Link>
            </div>
          </div>
          <div className="scrap-monument" data-od-id="home-hero">
            <div className="monument-label">
              <span>记录 / 设计、代码、废料、界面秩序</span>
              <strong>11</strong>
            </div>
          </div>
        </div>

        <div className="ticker" aria-label="站点广播">
          <span>
            Scraplog dispatch 11 / archive rebuilt / no fake metrics / readable
            first / industrial texture under control /
          </span>
          <span>
            Scraplog dispatch 11 / archive rebuilt / no fake metrics / readable
            first / industrial texture under control /
          </span>
        </div>

        <section className="section-block" aria-labelledby="home-map-title">
          <div className="section-heading">
            <h2 id="home-map-title">内容介绍</h2>
            <p>目前主要包含三部分</p>
          </div>
          <div className="signal-strip" data-od-id="home-signal-strip">
            <article className="signal-cell">
              <span className="meta">01 / Reading</span>
              <h3>档案馆</h3>
              <p>归档文章</p>
            </article>
            <article className="signal-cell">
              <span className="meta">02 / Workbench</span>
              <h3>项目零件板</h3>
              <p>项目简介</p>
            </article>
            <article className="signal-cell">
              <span className="meta">03 / Shelter</span>
              <h3>关于</h3>
              <p>个人介绍、技能、经历</p>
            </article>
          </div>
        </section>
      </div>
    </section>
  );
}
