import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, MessageSquare } from 'lucide-react';

const CommentsSection = ({ postId }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchComments = async () => {
    try {
      const records = await pb.collection('blog_comments').getList(1, 50, {
        filter: `post_id="${postId}" && approved=true`,
        sort: '-created_at',
        expand: 'author',
        $autoCancel: false
      });
      setComments(records.items);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (postId) {
      fetchComments();
    }
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await pb.collection('blog_comments').create({
        post_id: postId,
        author: currentUser.id,
        content: newComment,
        approved: false // Requires moderation
      }, { $autoCancel: false });
      
      toast.success('Comment submitted and pending approval');
      setNewComment('');
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('Failed to submit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-16 pt-10 border-t">
      <h3 className="text-2xl font-bold mb-8 flex items-center">
        <MessageSquare className="w-6 h-6 mr-3 text-primary" />
        Comments ({comments.length})
      </h3>

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="mb-10 bg-muted/30 p-6 rounded-2xl">
          <div className="flex items-start space-x-4">
            <Avatar className="w-10 h-10 border">
              <AvatarImage src={currentUser?.avatar ? pb.files.getUrl(currentUser, currentUser.avatar) : ''} />
              <AvatarFallback>{currentUser?.name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <Textarea
                placeholder="Share your thoughts..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[100px] resize-y bg-background"
                required
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Post Comment
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-10 bg-muted/30 p-8 rounded-2xl text-center">
          <p className="text-muted-foreground mb-4">Join the conversation</p>
          <Button asChild>
            <Link to="/login">Sign in to comment</Link>
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading comments...</div>
        ) : comments.length > 0 ? (
          comments.map(comment => (
            <div key={comment.id} className="flex space-x-4 p-6 rounded-2xl bg-[hsl(var(--blog-comment-bg))]">
              <Avatar className="w-10 h-10 border">
                <AvatarImage src={comment.expand?.author?.avatar ? pb.files.getUrl(comment.expand.author, comment.expand.author.avatar) : ''} />
                <AvatarFallback>{comment.expand?.author?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{comment.expand?.author?.name || 'Anonymous'}</h4>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No comments yet. Be the first to share your thoughts!
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsSection;