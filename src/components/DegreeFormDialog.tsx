import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type DegreeProgram = Tables<'degree_programs'>;

const formSchema = z.object({
  program_name: z.string().min(1, 'Program name is required'),
  program_type: z.string().optional(),
  minimum_gpa: z.coerce
    .number()
    .min(0, 'GPA must be at least 0')
    .max(5, 'GPA must be at most 5')
    .optional()
    .nullable()
    .transform((val) => (val === 0 ? null : val)),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DegreeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  degree: DegreeProgram | null;
  onSuccess: () => void;
}

export function DegreeFormDialog({
  open,
  onOpenChange,
  degree,
  onSuccess,
}: DegreeFormDialogProps) {
  const { toast } = useToast();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      program_name: '',
      program_type: '',
      minimum_gpa: null,
      description: '',
    },
  });

  useEffect(() => {
    if (degree) {
      form.reset({
        program_name: degree.program_name,
        program_type: degree.program_type || '',
        minimum_gpa: degree.minimum_gpa,
        description: degree.description || '',
      });
    } else {
      form.reset({
        program_name: '',
        program_type: '',
        minimum_gpa: null,
        description: '',
      });
    }
  }, [degree, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (degree) {
        const updateData: Partial<DegreeProgram> = {
          program_name: data.program_name,
          program_type: data.program_type || null,
          minimum_gpa: data.minimum_gpa,
          description: data.description || null,
        };

        const { error } = await supabase
          .from('degree_programs')
          .update(updateData)
          .eq('program_id', degree.program_id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Degree program updated successfully',
        });
      } else {
        const insertData: TablesInsert<'degree_programs'> = {
          program_name: data.program_name,
          program_type: data.program_type || null,
          minimum_gpa: data.minimum_gpa,
          description: data.description || null,
        };

        const { error } = await supabase
          .from('degree_programs')
          .insert(insertData);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Degree program created successfully',
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving degree:', error);
      toast({
        title: 'Error',
        description: `Failed to ${degree ? 'update' : 'create'} degree program`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {degree ? 'Edit Degree Program' : 'Create Degree Program'}
          </DialogTitle>
          <DialogDescription>
            {degree
              ? 'Update the details of the degree program'
              : 'Add a new degree program to the system'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="program_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Program Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Bachelor of Computer Science" {...field} />
                  </FormControl>
                  <FormDescription>The official name of the degree program</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="program_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Program Type</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Bachelor's, Master's, PhD"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>The level or type of degree</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="minimum_gpa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum GPA</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="5"
                      placeholder="e.g., 3.0"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Minimum GPA requirement for admission (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter a detailed description of the degree program..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    A brief overview of what this degree program offers
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Saving...'
                  : degree
                    ? 'Update'
                    : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
