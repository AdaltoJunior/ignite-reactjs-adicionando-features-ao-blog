import { useEffect, useState } from 'react';

import { GetStaticProps } from 'next';
import Link from 'next/link';
import Head from 'next/head';

import Prismic from '@prismicio/client';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { FiCalendar, FiUser } from 'react-icons/fi';

import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextPage, setNextPage] = useState(postsPagination.next_page);

  function formatPosts(unformattedPosts: Post[]): Post[] {
    const formattedPosts: Post[] = unformattedPosts.map(post => {
      const formattedPublicationDate = format(
        new Date(post.first_publication_date),
        'dd MMM yyyy',
        {
          locale: ptBR,
        }
      );

      return {
        uid: post.uid,
        data: post.data,
        first_publication_date: formattedPublicationDate,
      };
    });

    return formattedPosts;
  }

  async function handleLoadMorePosts(): Promise<void> {
    const response = await fetch(nextPage);
    const postsResponse: PostPagination = await response.json();
    const morePosts = formatPosts(postsResponse.results);

    setNextPage(postsResponse.next_page);
    setPosts([...posts, ...morePosts]);
  }

  useEffect(() => {
    const formattedPosts = formatPosts(postsPagination.results);
    setPosts(formattedPosts);
  }, [postsPagination.results]);

  return (
    <>
      <Head>
        <title>Spacetraveling</title>
      </Head>

      <main className={styles.container}>
        <div className={commonStyles.container}>
          <header className={styles.header}>
            <img src="/images/logo.svg" alt="logo" />
          </header>

          {posts.map(post => (
            <article className={styles.post} key={post.uid}>
              <Link href={`/post/${post.uid}`}>
                <a>
                  <strong className={styles.postTitle}>
                    {post.data.title}
                  </strong>
                  <p className={styles.postSubtitle}>{post.data.subtitle}</p>
                  <div className={styles.postInfoContainer}>
                    <div className={styles.postInfo}>
                      <FiCalendar size="20px" />
                      <time>{post.first_publication_date}</time>
                    </div>
                    <div className={styles.postInfo}>
                      <FiUser size="20px" />
                      {post.data.author}
                    </div>
                  </div>
                </a>
              </Link>
            </article>
          ))}

          {nextPage && (
            <button
              type="button"
              className={styles.loadMoreButton}
              onClick={handleLoadMorePosts}
            >
              Carregar mais posts
            </button>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 1,
    }
  );

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page,
        results: postsResponse.results,
      },
    },
    revalidate: 60,
  };
};
