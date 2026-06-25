"use client";

import { useEffect, useRef } from "react";
import emailjs from "@emailjs/browser";
import { APP_ROUTES } from "@/lib/constants";

const CONTACT_STYLES = `
  :root{
    --black:#0B0B0C;
    --panel:#16161A;
    --gold:#D4A017;
    --gold-bright:#E8B93B;
    --ash:#9A968C;
    --line:#2A2A2E;
    --ok:#3FA66A;
    --err:#C9543A;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{
    background:var(--black);
    color:#F4F1EA;
    font-family:'DM Mono', monospace;
    min-height:100vh;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:48px 20px;
  }
  .wrap{
    width:100%;
    max-width:560px;
  }
  .eyebrow{
    font-size:12px;
    letter-spacing:0.18em;
    text-transform:uppercase;
    color:var(--gold);
    margin:0 0 14px;
  }
  h1{
    font-family:'Syne', sans-serif;
    font-weight:800;
    font-size:clamp(32px,5vw,44px);
    line-height:1.05;
    margin:0 0 12px;
    color:#FAF8F2;
  }
  p.lead{
    color:var(--ash);
    font-size:14px;
    line-height:1.6;
    margin:0 0 36px;
    max-width:46ch;
  }
  .card{
    background:var(--panel);
    border:1px solid var(--line);
    border-radius:2px;
    padding:32px;
    position:relative;
  }
  .card::before{
    content:"";
    position:absolute;
    top:0;left:0;
    width:100%;
    height:3px;
    background:linear-gradient(90deg, var(--gold), transparent 70%);
  }
  label{
    display:block;
    font-size:11px;
    letter-spacing:0.12em;
    text-transform:uppercase;
    color:var(--ash);
    margin:0 0 8px;
  }
  .field{margin-bottom:22px;}
  .row{display:grid; grid-template-columns:1fr 1fr; gap:18px;}
  @media (max-width:520px){ .row{grid-template-columns:1fr;} }
  input, select, textarea{
    width:100%;
    background:#0F0F11;
    border:1px solid var(--line);
    color:#F4F1EA;
    font-family:'DM Mono', monospace;
    font-size:14px;
    padding:12px 14px;
    border-radius:2px;
    transition:border-color .15s ease;
  }
  input:focus, select:focus, textarea:focus{
    outline:none;
    border-color:var(--gold);
  }
  textarea{min-height:120px; resize:vertical;}
  select{appearance:none; cursor:pointer;}
  .help{
    font-size:11px;
    color:var(--ash);
    margin-top:6px;
    line-height:1.5;
  }
  button{
    width:100%;
    background:var(--gold);
    color:#0B0B0C;
    border:none;
    font-family:'Syne', sans-serif;
    font-weight:700;
    font-size:14px;
    letter-spacing:0.04em;
    text-transform:uppercase;
    padding:15px 0;
    border-radius:2px;
    cursor:pointer;
    transition:background .15s ease, transform .1s ease;
    margin-top:6px;
  }
  button:hover{background:var(--gold-bright);}
  button:active{transform:scale(0.99);}
  button:disabled{opacity:0.6; cursor:not-allowed;}
  .status{
    margin-top:18px;
    font-size:13px;
    padding:12px 14px;
    border-radius:2px;
    display:none;
    line-height:1.5;
  }
  .status.show{display:block;}
  .status.ok{ background:rgba(63,166,106,0.12); border:1px solid var(--ok); color:#9FDFB8; }
  .status.err{ background:rgba(201,84,58,0.12); border:1px solid var(--err); color:#F0A892; }
  .footer-note{
    margin-top:24px;
    font-size:11px;
    color:var(--ash);
    line-height:1.6;
  }
  .footer-note a{color:var(--gold); text-decoration:none;}
  .footer-note a:hover{text-decoration:underline;}
`;

export default function ContactPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const statusBoxRef = useRef<HTMLDivElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Uses the existing EmailJS account already configured for the T-Vault waitlist.
    emailjs.init({ publicKey: "4pkyVmD_Szio4gRT7" });

    const form = formRef.current;
    const statusBox = statusBoxRef.current;
    const submitBtn = submitBtnRef.current;
    if (!form || !statusBox || !submitBtn) return;

    function showStatus(type: string, text: string) {
      if (!statusBox) return;
      statusBox.className = "status show " + type;
      statusBox.textContent = text;
    }

    const handleSubmit = (e: SubmitEvent) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
      statusBox.className = "status";

      const params = {
        from_name: (document.getElementById("name") as HTMLInputElement).value,
        from_email: (document.getElementById("email") as HTMLInputElement).value,
        phone:
          (document.getElementById("phone") as HTMLInputElement).value ||
          "Not provided",
        service: (document.getElementById("reason") as HTMLSelectElement).value,
        message: (document.getElementById("message") as HTMLTextAreaElement)
          .value,
      };

      emailjs
        .send("service_2qf25vg", "template_c6hp195", params)
        .then(function () {
          showStatus(
            "ok",
            "Message sent. We'll get back to you within one business day."
          );
          form.reset();
        })
        .catch(function (err) {
          showStatus(
            "err",
            "Something went wrong sending your message. Please email us directly at dynastyweb26@gmail.com."
          );
          console.error(err);
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Send message";
        });
    };

    form.addEventListener("submit", handleSubmit);
    return () => {
      form.removeEventListener("submit", handleSubmit);
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CONTACT_STYLES }} />
      <div className="wrap">
        <p className="eyebrow">T-Vault Support</p>
        <h1>Get in touch.</h1>
        <p className="lead">
          Questions about your account, a document upload, billing, or your
          privacy rights. We read every message and reply directly — usually
          within one business day.
        </p>

        <div className="card">
          <form id="contactForm" ref={formRef}>
            <div className="row">
              <div className="field">
                <label htmlFor="name">Name</label>
                <input type="text" id="name" name="name" required />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input type="email" id="email" name="email" required />
              </div>
            </div>

            <div className="field">
              <label htmlFor="phone">
                Phone{" "}
                <span
                  style={{
                    color: "var(--ash)",
                    textTransform: "none",
                    letterSpacing: 0,
                  }}
                >
                  (optional)
                </span>
              </label>
              <input type="tel" id="phone" name="phone" placeholder="" />
            </div>

            <div className="field">
              <label htmlFor="reason">Reason for contact</label>
              <select id="reason" name="reason" required defaultValue="">
                <option value="" disabled>
                  Select one
                </option>
                <option value="General Support">General support</option>
                <option value="Billing / Subscription">
                  Billing / subscription
                </option>
                <option value="Privacy Request - Access">
                  Privacy request — access my data
                </option>
                <option value="Privacy Request - Deletion">
                  Privacy request — delete my account/data
                </option>
                <option value="Privacy Request - Other">
                  Privacy request — other
                </option>
                <option value="Bug Report">Bug report</option>
                <option value="Other">Other</option>
              </select>
              <p className="help">
                Privacy requests are handled per our{" "}
                <a href={APP_ROUTES.privacy} style={{ color: "var(--gold)" }}>
                  Privacy Policy
                </a>{" "}
                and are typically completed within 30 days.
              </p>
            </div>

            <div className="field">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                required
                placeholder="Tell us what's going on..."
              />
            </div>

            <button type="submit" id="submitBtn" ref={submitBtnRef}>
              Send message
            </button>
            <div className="status" id="statusBox" ref={statusBoxRef} />
          </form>

          <p className="footer-note">
            Prefer email? Reach us directly at{" "}
            <a href="mailto:dynastyweb26@gmail.com">dynastyweb26@gmail.com</a>.
          </p>
        </div>
      </div>
    </>
  );
}
