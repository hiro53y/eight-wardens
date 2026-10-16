// 共通の部品：小窓・遊び方・設定
import { useState, type ReactNode } from 'react';
import { playSe } from '../audio/sound';
import type { Settings } from '../game/types';

export const VERSION = '3.0.0';

export function Modal({ title, onClose, children, wide, className }: { title?: ReactNode; onClose?: () => void; children: ReactNode; wide?: boolean; className?: string }) {
  return (
    <div className="modal-back" onPointerDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className={`modal ${wide ? 'wide' : ''} ${className ?? ''}`} role="dialog" aria-modal="true">
        {(title || onClose) && (
          <div className="modal-head">
            <div className="modal-title">{title}</div>
            {onClose && <button className="x" aria-label="閉じる" onClick={() => { playSe('menu'); onClose(); }}>×</button>}
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Help({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="遊び方" onClose={onClose} wide>
      <div className="help">
        <section>
          <h3>村を守る</h3>
          <p>左から来る魔物を、右上の城門へ通さないように8人の守り手で守ります。攻撃は自動。城門を抜けられると村人が減り、0人で負けです。</p>
        </section>
        <section>
          <h3>EXP と金貨はみんなで共有</h3>
          <p>敵を倒すと EXP と金貨が入ります。<b>EXP を払って好きな仲間のレベルを上げます</b>。戦闘中でも、一時停止中でも育てられます。</p>
        </section>
        <section>
          <h3>休憩</h3>
          <p>札の <b>Zzz</b> で休ませると攻撃しない代わりにゲージがたまり、満タンで EXP が入ります。敵が来ない場所の仲間は休ませるのが得。<b>ボスのステージでは休憩が効きません</b>。ボスを倒すたびに休憩の EXP が増えます。</p>
        </section>
        <section>
          <h3>転職（Lv3）</h3>
          <p>Lv3 で金貨を払い、2つの職から1つを選んで転職します（剣・狩・盗の3系統×3段）。3段目はさらに Lv5（玄人は Lv10）まで。その先は金貨で上限突破できます。</p>
        </section>
        <section>
          <h3>敵の種類</h3>
          <p><b>飛行</b>は道を無視して城門へ飛びます。剣は当たりにくく、弓や銃がよく効きます。<b>メタル</b>はふつうの攻撃が1しか通りません。武士・侍、鎧を剥ぐ投擲士が頼り。倒すと EXP と金貨がたくさん入ります。</p>
        </section>
        <section>
          <h3>配置</h3>
          <p>仲間に触れて「配置換え」、光る台座に触れると移動（いれば入れ替え）。出撃前なら、仲間を選んで空いた台座に触れるだけで動かせます。</p>
        </section>
        <section>
          <h3>盗賊の系統</h3>
          <p>盗賊・忍者・暗殺者が止めを刺すと金貨が3倍。海賊は当てるたびに金貨、錬金術師は休憩中に金貨を作ります。</p>
        </section>
        <section>
          <h3>必殺技</h3>
          <p>攻撃するとゲージ（足元の輪・札の下の線）がたまり、満タンで<b>札の「技」</b>か<b>仲間を素早く2回タップ</b>で撃てます。職ごとに回転斬り・矢の雨・煙玉などが違います。設定で自動にもできます。</p>
        </section>
        <section>
          <h3>連携（隣り合わせ）</h3>
          <p>上下左右の台座が隣。同じ系統が隣だと攻撃+8%（3人まで）。剣の隣の狩は射程+15%、盗の隣の剣は速さ+10%、狩と盗が隣なら会心+5%。光る線で見えます。</p>
        </section>
        <section>
          <h3>早呼び・会心・連撃</h3>
          <p>左下の「呼ぶ」で次の群れを今すぐ呼ぶと、縮めた秒数ぶん金貨。攻撃は時々<b>会心</b>（2倍）。続けて倒すと連撃になり、10連撃で<b>フィーバー</b>（金貨×1.5・EXP×1.2）。</p>
        </section>
        <section>
          <h3>技を持つ敵とボス</h3>
          <p>分裂・盾・回復・姿を消す・途中で降りる・怒ると速い、などの敵が出ます。ボスは体力が減ると怒り、手下を呼ぶ・突進・咆哮（守り手がすくむ）・潜る・再生をしてきます。</p>
        </section>
        <section>
          <h3>装備・店・村</h3>
          <p>強い敵は宝箱を落とし、結果の画面で開きます。武器は同じ系統の仲間だけ、お守りは誰でも。店ではクリアのたびに品が変わります。村の施設（柵・訓練所・鍛冶屋・市場・見張り台）は金貨で育ちます。</p>
        </section>
        <section>
          <h3>無限の塔・毎日の挑戦</h3>
          <p>最初のボスを倒すと開きます。塔は階ごとに恩恵を選んで、どこまで登れるかの勝負。毎日の挑戦は日替わりの条件で、その日初めて勝つと宝箱が2つ。</p>
        </section>
      </div>
    </Modal>
  );
}

export function SettingsPanel({ settings, onSettings, onClose, onWipe }: { settings: Settings; onSettings: (s: Settings) => void; onClose: () => void; onWipe?: () => void }) {
  const [confirm, setConfirm] = useState(0);
  const set = (k: Partial<Settings>) => onSettings({ ...settings, ...k });
  return (
    <Modal title="設定" onClose={onClose}>
      <div className="settings">
        <label className="row">
          <span>BGM</span>
          <input type="range" min={0} max={1} step={0.05} value={settings.bgm} onChange={(e) => set({ bgm: Number(e.target.value) })} />
          <b>{Math.round(settings.bgm * 100)}</b>
        </label>
        <label className="row">
          <span>効果音</span>
          <input type="range" min={0} max={1} step={0.05} value={settings.se} onChange={(e) => set({ se: Number(e.target.value) })} onPointerUp={() => playSe('hit')} />
          <b>{Math.round(settings.se * 100)}</b>
        </label>
        <label className="row">
          <span>ダメージの数字</span>
          <button className={`toggle ${settings.numbers ? 'on' : ''}`} onClick={() => set({ numbers: !settings.numbers })}>{settings.numbers ? '出す' : '出さない'}</button>
        </label>
        <label className="row">
          <span>技を自動で撃つ</span>
          <button className={`toggle ${settings.autoSkill ? 'on' : ''}`} onClick={() => set({ autoSkill: !settings.autoSkill })}>{settings.autoSkill ? 'する' : 'しない'}</button>
        </label>
        <div className="row">
          <span>はじめの速さ</span>
          <div className="seg">
            {([1, 2, 3] as const).map((s) => <button key={s} className={settings.speed === s ? 'on' : ''} onClick={() => set({ speed: s })}>×{s}</button>)}
          </div>
        </div>
        {onWipe && (
          <div className="row danger">
            <span>データ削除</span>
            {confirm === 0 && <button className="btn small red" onClick={() => setConfirm(1)}>記録を消す…</button>}
            {confirm === 1 && (
              <span className="confirm">
                本当に消しますか？
                <button className="btn small red" onClick={() => { playSe('break'); onWipe(); }}>消す</button>
                <button className="btn small" onClick={() => setConfirm(0)}>やめる</button>
              </span>
            )}
          </div>
        )}
        <p className="ver">Eight Wardens Ver.{VERSION}</p>
      </div>
    </Modal>
  );
}

export function fmtNum(n: number): string {
  return Math.floor(n).toLocaleString('ja-JP');
}
