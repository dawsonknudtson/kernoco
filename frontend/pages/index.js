import Head from 'next/head';
import Landing from '../components/landing';

export default function Home() {
  return (
    <>
      <Head>
        <title>Kernoco - AI-Powered Meeting Productivity Tool</title>
        <meta name="description" content="Transform your meetings into actionable outcomes with AI-powered transcription and task extraction." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/kernoco-logo.png" />
      </Head>
      <Landing />
    </>
  );
} 