// 共通の部品：小窓・遊び方・設定
import { useState, type ReactNode } from 'react';
import { playSe } from '../audio/sound';
import type { Settings } from '../game/types';

export const VERSION = '2.0.0';

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
