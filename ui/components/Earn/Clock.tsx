import React, { ReactElement } from "react"

// TODO: get numbers and labels from timeLeft

// {
//   timeLeft,
// }: {
//   timeLeft?: number
// }
export default function Clock(): ReactElement {
  return (
    <div className="clock">
      <div className="clock_segment">
        <div className="clock_time serif_header">47</div>
        <div className="clock_label">Days</div>
      </div>
      <div className="clock_segment">
        <div className="clock_time serif_header">22</div>
        <div className="clock_label">Hours</div>
      </div>
      <style jsx>{`
        .clock {
          display: flex;
          justify-content: space-between;
          width: 117px;
          height: 65px;
          flex: 0 0 auto;
        }
        .clock_segment {
          position: relative;
          width: 52px;
          text-align: center;
          box-shadow: var(--shadow-lifted);
          border-radius: 4px;
          background: var(--clock-gradient);
        }
        .clock_segment:after {
          content: "";
          width: 100%;
          height: 1px;
          opacity: 50%;
          background: var(--green-120);
          position: absolute;
          top: 50%;
          right: 0;
        }
        .clock_time {
          color: var(--success);
          font-size: 38px;
          font-weight: 500;
          line-height: 42px;
          text-align: center;
          margin-top: 10px;
        }
        .clock_label {
          color: var(--green-20);
          font-size: 14px;
          font-weight: 600;
          line-height: 16px;
          text-align: center;
          margin-top: -5px;
        }
      `}</style>
    </div>
  )
}
